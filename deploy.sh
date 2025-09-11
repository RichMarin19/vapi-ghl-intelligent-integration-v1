#!/bin/bash

# VAPI-GHL Lambda Deployment Script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_env_vars() {
    if [ -z "$GHL_CLIENT_ID" ]; then
        print_error "GHL_CLIENT_ID environment variable is not set"
        return 1
    fi
    
    if [ -z "$GHL_CLIENT_SECRET" ]; then
        print_error "GHL_CLIENT_SECRET environment variable is not set"
        return 1
    fi
    
    if [ -z "$GHL_LOCATION_ID" ]; then
        print_error "GHL_LOCATION_ID environment variable is not set"
        return 1
    fi
    
    if [ -z "$VAPI_API_KEY" ]; then
        print_error "VAPI_API_KEY environment variable is not set"
        return 1
    fi
    
    if [ -z "$VAPI_PHONE_NUMBER_ID" ]; then
        print_error "VAPI_PHONE_NUMBER_ID environment variable is not set"
        return 1
    fi
    
    if [ -z "$AWS_REGION" ]; then
        print_warning "AWS_REGION not set, using us-east-1"
        export AWS_REGION="us-east-1"
    fi
    
    # Check that JWT tokens are available (either in env vars or will be migrated to Parameter Store)
    if [ -z "$GHL_ACCESS_TOKEN" ] && [ -z "$GHL_REFRESH_TOKEN" ]; then
        print_warning "GHL OAuth2 tokens not found in environment variables. They should be stored in AWS Parameter Store."
    fi
    
    return 0
}

# Install dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install dependencies"
        return 1
    fi
    return 0
}

# Create deployment package
create_package() {
    print_status "Creating deployment package..."
    
    # Remove existing package
    rm -f function.zip
    
    # Create zip excluding unnecessary files
    zip -r function.zip . -x \
        "*.git*" \
        "node_modules/.cache/*" \
        "*.sh" \
        "*.md" \
        ".env*" \
        "*.log"
    
    if [ $? -ne 0 ]; then
        print_error "Failed to create deployment package"
        return 1
    fi
    
    print_status "Deployment package created: function.zip"
    return 0
}

# Create IAM role for Lambda (if it doesn't exist)
create_iam_role() {
    print_status "Checking for Lambda execution role..."
    
    local role_name="vapi-ghl-lambda-role"
    
    # Check if role exists
    aws iam get-role --role-name $role_name --region $AWS_REGION 2>/dev/null
    if [ $? -eq 0 ]; then
        print_status "IAM role already exists"
        echo "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/$role_name"
        return 0
    fi
    
    print_status "Creating IAM role for Lambda execution..."
    
    # Create trust policy
    cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
    
    # Create role
    aws iam create-role \
        --role-name $role_name \
        --assume-role-policy-document file://trust-policy.json \
        --region $AWS_REGION
    
    if [ $? -ne 0 ]; then
        print_error "Failed to create IAM role"
        return 1
    fi
    
    # Attach basic execution policy
    aws iam attach-role-policy \
        --role-name $role_name \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
        --region $AWS_REGION
    
    # Create and attach Parameter Store policy
    print_status "Creating Parameter Store policy..."
    cat > parameter-store-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ssm:GetParameter",
                "ssm:GetParameters",
                "ssm:PutParameter"
            ],
            "Resource": [
                "arn:aws:ssm:*:*:parameter/vapi-ghl-integration/*"
            ]
        }
    ]
}
EOF
    
    aws iam put-role-policy \
        --role-name $role_name \
        --policy-name "ParameterStoreAccess" \
        --policy-document file://parameter-store-policy.json \
        --region $AWS_REGION
    
    # Clean up temp files
    rm -f trust-policy.json parameter-store-policy.json
    
    print_status "IAM role created successfully"
    echo "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/$role_name"
    return 0
}

# Deploy or update Lambda function
deploy_function() {
    local function_name="vapi-ghl-integration"
    local role_arn=$1
    
    print_status "Checking if Lambda function exists..."
    
    # Check if function exists
    aws lambda get-function --function-name $function_name --region $AWS_REGION 2>/dev/null
    if [ $? -eq 0 ]; then
        print_status "Updating existing Lambda function..."
        aws lambda update-function-code \
            --function-name $function_name \
            --zip-file fileb://function.zip \
            --region $AWS_REGION
        
        if [ $? -ne 0 ]; then
            print_error "Failed to update Lambda function"
            return 1
        fi
        
        # Update environment variables (excluding large JWT tokens - they're in Parameter Store)
        aws lambda update-function-configuration \
            --function-name $function_name \
            --environment "Variables={GHL_CLIENT_ID=$GHL_CLIENT_ID,GHL_CLIENT_SECRET=$GHL_CLIENT_SECRET,GHL_LOCATION_ID=$GHL_LOCATION_ID,VAPI_API_KEY=$VAPI_API_KEY,VAPI_ASSISTANT_ID=$VAPI_ASSISTANT_ID,VAPI_PHONE_NUMBER_ID=$VAPI_PHONE_NUMBER_ID,VAPI_SECRET_TOKEN=$VAPI_SECRET_TOKEN,GHL_WEBHOOK_SECRET=$GHL_WEBHOOK_SECRET,GHL_ACCESS_TOKEN=$GHL_ACCESS_TOKEN,GHL_REFRESH_TOKEN=$GHL_REFRESH_TOKEN}" \
            --region $AWS_REGION
    else
        print_status "Creating new Lambda function..."
        aws lambda create-function \
            --function-name $function_name \
            --runtime nodejs22.x \
            --role $role_arn \
            --handler index.handler \
            --zip-file fileb://function.zip \
            --timeout 60 \
            --memory-size 256 \
            --environment "Variables={GHL_CLIENT_ID=$GHL_CLIENT_ID,GHL_CLIENT_SECRET=$GHL_CLIENT_SECRET,GHL_LOCATION_ID=$GHL_LOCATION_ID,VAPI_API_KEY=$VAPI_API_KEY,VAPI_ASSISTANT_ID=$VAPI_ASSISTANT_ID,VAPI_PHONE_NUMBER_ID=$VAPI_PHONE_NUMBER_ID,VAPI_SECRET_TOKEN=$VAPI_SECRET_TOKEN,GHL_WEBHOOK_SECRET=$GHL_WEBHOOK_SECRET,GHL_ACCESS_TOKEN=$GHL_ACCESS_TOKEN,GHL_REFRESH_TOKEN=$GHL_REFRESH_TOKEN}" \
            --region $AWS_REGION
        
        if [ $? -ne 0 ]; then
            print_error "Failed to create Lambda function"
            return 1
        fi
    fi
    
    print_status "Lambda function deployed successfully"
    return 0
}

# Get function URL
get_function_url() {
    local function_name="vapi-ghl-integration"
    
    print_status "Setting up Function URL..."
    
    # Create or get function URL configuration
    aws lambda create-function-url-config \
        --function-name $function_name \
        --auth-type NONE \
        --region $AWS_REGION 2>/dev/null
    
    # Get the function URL
    local function_url=$(aws lambda get-function-url-config \
        --function-name $function_name \
        --region $AWS_REGION \
        --query 'FunctionUrl' \
        --output text 2>/dev/null)
    
    if [ $? -eq 0 ] && [ ! -z "$function_url" ]; then
        print_status "Function URL: $function_url"
        print_status "Use this URL as your VAPI webhook endpoint"
    else
        print_warning "Could not retrieve function URL. You may need to configure it manually in the AWS Console."
    fi
}

# Main deployment process
main() {
    print_status "Starting VAPI-GHL Lambda deployment..."
    
    # Check environment variables
    if ! check_env_vars; then
        print_error "Environment variable check failed"
        exit 1
    fi
    
    # Install dependencies
    if ! install_dependencies; then
        exit 1
    fi
    
    # Create deployment package
    if ! create_package; then
        exit 1
    fi
    
    # Create IAM role
    role_arn=$(create_iam_role)
    if [ $? -ne 0 ]; then
        exit 1
    fi
    
    # Wait a moment for IAM role to propagate
    print_status "Waiting for IAM role to propagate..."
    sleep 10
    
    # Deploy function
    if ! deploy_function "$role_arn"; then
        exit 1
    fi
    
    # Get function URL
    get_function_url
    
    # Clean up
    rm -f function.zip
    
    print_status "Deployment completed successfully!"
    print_status "Next steps:"
    echo "1. Configure the Function URL as your VAPI webhook endpoint"
    echo "2. Update your VAPI assistant with the webhook URL"
    echo "3. Test the integration with a call"
}

# Run main function
main "$@"
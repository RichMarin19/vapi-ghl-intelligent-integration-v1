#!/usr/bin/env node

// Simple Question-Based Field Mapper
// Maps VAPI prompt questions directly to custom fields

export class SimpleQuestionMapper {
    constructor() {
        this.questionMappings = new Map();
        this.initializeQuestionMappings();
    }

    initializeQuestionMappings() {
        // Direct question-to-field mappings from VAPI prompt
        this.questionMappings.set('motivation', {
            questions: [
                "What's got you thinking about selling your home yourself instead of working with an agent?",
                "what's got you thinking about selling",
                "thinking about selling your home yourself"
            ],
            fieldName: 'Motivation'
        });

        this.questionMappings.set('expectations', {
            questions: [
                "What's most important to you as you go through this selling process?",
                "what's most important to you",
                "most important to you as you go through this selling process"
            ],
            fieldName: 'Expectations'
        });

        this.questionMappings.set('disappointments', {
            questions: [
                "What's been the most challenging or disappointing part of selling on your own so far?",
                "most challenging or disappointing part",
                "disappointing part of selling on your own"
            ],
            fieldName: 'Disappointments'
        });

        this.questionMappings.set('concerns', {
            questions: [
                "Is there anything you're concerned about as you go through this on your own?",
                "anything you're concerned about",
                "concerned about as you go through this"
            ],
            fieldName: 'Concerns'
        });

        this.questionMappings.set('nextDestination', {
            questions: [
                "Where are you planning to go after you sell?",
                "where are you planning to go",
                "planning to go after you sell"
            ],
            fieldName: 'Next Destination'
        });

        this.questionMappings.set('timeline', {
            questions: [
                "Ideally, when would you like to have your home sold and be moved out?",
                "when would you like to have your home sold",
                "ideally, when would you like"
            ],
            fieldName: 'Timeline'
        });

        this.questionMappings.set('askingPrice', {
            questions: [
                "What price are you hoping to get for your home?",
                "what price are you hoping",
                "price are you hoping to get"
            ],
            fieldName: 'Asking Price'
        });

        this.questionMappings.set('opennessToRelist', {
            questions: [
                "If a great buyer came along, would you be open to working with an agent",
                "would you be open to working with an agent",
                "great buyer came along"
            ],
            fieldName: 'Openness to Re-list'
        });
    }

    extractFieldFromSummary(summary, fieldKey) {
        const mapping = this.questionMappings.get(fieldKey);
        if (!mapping) return null;

        const summaryLower = summary.toLowerCase();

        // Look for any of the question variations
        for (const question of mapping.questions) {
            const questionLower = question.toLowerCase();
            
            // Find the question in the summary
            const questionIndex = summaryLower.indexOf(questionLower);
            if (questionIndex === -1) continue;

            // Look for the answer after the question
            const afterQuestion = summary.substring(questionIndex + question.length);
            
            // Extract the answer (look for the next sentence or phrase)
            const answer = this.extractAnswer(afterQuestion);
            if (answer) {
                console.log(`📋 Found answer for ${mapping.fieldName}: "${answer}"`);
                return {
                    value: answer,
                    confidence: 90,
                    source: 'question_mapping'
                };
            }
        }

        return null;
    }

    extractAnswer(textAfterQuestion) {
        // Clean up the text
        let text = textAfterQuestion.trim();
        
        // Remove common filler words at the start
        text = text.replace(/^[\s,.\-:]+/, '');
        text = text.replace(/^(well|um|uh|so|like|you know|i mean)[\s,]+/i, '');
        
        // Extract until the next question or natural break
        const stopPatterns = [
            /\. [A-Z]/,  // Next sentence
            /\? /,       // Next question
            /\. The /,   // Natural break
            /\. Olivia/, // AI assistant name
            /\. They/,   // Natural break
            /\. Jack/    // Common name break
        ];
        
        let endIndex = text.length;
        for (const pattern of stopPatterns) {
            const match = text.search(pattern);
            if (match !== -1 && match < endIndex) {
                endIndex = match + 1; // Include the period
            }
        }
        
        let answer = text.substring(0, endIndex).trim();
        
        // Clean up the answer
        answer = answer.replace(/^[\s,.\-:]+/, '');
        answer = answer.replace(/[\s,.\-:]+$/, '');
        
        // Only return if it's a meaningful answer (not too short, not just punctuation)
        if (answer.length > 3 && /[a-zA-Z]/.test(answer)) {
            return answer;
        }
        
        return null;
    }

    // Direct information extraction when questions aren't present
    extractDirectFromSummary(summary) {
        console.log('🎯 Extracting directly from call summary (no questions found)');
        const extractedFields = {};
        const summaryLower = summary.toLowerCase();

        // Direct extraction based on summary content
        // Motivation: Look for selling reasons with broader patterns (priority order matters)
        if (summaryLower.includes('frustrated') && (summaryLower.includes('agent') || summaryLower.includes('calls'))) {
            extractedFields.motivation = {
                value: 'Frustrated by agent calls',
                confidence: 90,
                source: 'direct_extraction'
            };
        } else if (summaryLower.includes('save commission') || summaryLower.includes('saving commission') || summaryLower.includes('avoid commission') || (summaryLower.includes('commission') && (summaryLower.includes('save') || summaryLower.includes('avoid')))) {
            extractedFields.motivation = {
                value: 'Save commission',
                confidence: 85,
                source: 'direct_extraction'
            };
        } else if (summaryLower.includes('to move to') || summaryLower.includes('moving to') || summaryLower.includes('relocat')) {
            extractedFields.motivation = {
                value: 'Relocation',
                confidence: 85,
                source: 'direct_extraction'
            };
        } else if (summaryLower.includes('get the most money') || summaryLower.includes('maximize') || summaryLower.includes('most money')) {
            extractedFields.motivation = {
                value: 'Get the most money',
                confidence: 85,
                source: 'direct_extraction'
            };
        } else if (summaryLower.includes('sell') && (summaryLower.includes('quickly') || summaryLower.includes('fast') || summaryLower.includes('soon'))) {
            extractedFields.motivation = {
                value: 'Quick sale',
                confidence: 80,
                source: 'direct_extraction'
            };
        }

        // Expectations: Look for price or process expectations with broader patterns
        const millionMatch = summary.match(/\$?([\d,]+\.?\d*)\s*(?:million|mil|M)/i);
        const thousandMatch = summary.match(/\$?([\d,]+)(?:,000|k)/i);
        const dollarMatch = summary.match(/\$[\d,]+(?:\.\d{2})?(?!\s*(?:million|mil|M|k|thousand))/i);
        
        if (millionMatch) {
            const amount = millionMatch[1];
            extractedFields.expectations = {
                value: `$${amount}M`,
                confidence: 90,
                source: 'direct_extraction'
            };
        } else if (thousandMatch) {
            const amount = thousandMatch[1];
            extractedFields.expectations = {
                value: `$${amount}K`,
                confidence: 90,
                source: 'direct_extraction'
            };
        } else if (dollarMatch) {
            extractedFields.expectations = {
                value: dollarMatch[0],
                confidence: 90,
                source: 'direct_extraction'
            };
        } else if (summaryLower.includes('most money') || summaryLower.includes('maximize')) {
            extractedFields.expectations = {
                value: 'Get the most money possible',
                confidence: 85,
                source: 'direct_extraction'
            };
        }

        // Timeline: Look for time references
        const monthMatch = summary.match(/by\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i);
        if (monthMatch) {
            extractedFields.timeline = {
                value: monthMatch[1],
                confidence: 90,
                source: 'direct_extraction'
            };
        } else if (summaryLower.includes('year-end') || summaryLower.includes('by year-end')) {
            extractedFields.timeline = {
                value: 'Year-end',
                confidence: 90,
                source: 'direct_extraction'
            };
        }

        // Next Destination: Look for location references with broader patterns
        const moveToMatch = summary.match(/(?:to move to|moving to|relocat(?:ing)? to)\s+([A-Za-z\s]+?)(?:,|\.|$)/i);
        const stateMatch = summary.match(/(?:in|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(?:for|because|due)/i);
        const cityStateMatch = summary.match(/(?:in|to)\s+([A-Z][a-z]+,?\s+[A-Z]{2})\b/i);
        
        if (moveToMatch) {
            extractedFields.nextDestination = {
                value: moveToMatch[1].trim(),
                confidence: 90,
                source: 'direct_extraction'
            };
        } else if (cityStateMatch) {
            extractedFields.nextDestination = {
                value: cityStateMatch[1].trim(),
                confidence: 85,
                source: 'direct_extraction'
            };
        } else if (stateMatch) {
            extractedFields.nextDestination = {
                value: stateMatch[1].trim(),
                confidence: 80,
                source: 'direct_extraction'
            };
        }

        // Disappointments: Look for frustration or disappointment mentions with broader patterns
        if (summaryLower.includes('frustrated') && (summaryLower.includes('agent') || summaryLower.includes('calls'))) {
            extractedFields.disappointments = {
                value: 'Agent calls',
                confidence: 90,
                source: 'direct_extraction'
            };
        } else if (summaryLower.includes('frustrated') || summaryLower.includes('disappointing') || summaryLower.includes('disappointed')) {
            if (summaryLower.includes('agent') || summaryLower.includes('realtor')) {
                extractedFields.disappointments = {
                    value: 'Agent experience',
                    confidence: 90,
                    source: 'direct_extraction'
                };
            } else if (summaryLower.includes('buyer') || summaryLower.includes('quality')) {
                extractedFields.disappointments = {
                    value: 'Buyer quality',
                    confidence: 90,
                    source: 'direct_extraction'
                };
            } else if (summaryLower.includes('process') || summaryLower.includes('selling')) {
                extractedFields.disappointments = {
                    value: 'Selling process',
                    confidence: 85,
                    source: 'direct_extraction'
                };
            }
        } else if (summaryLower.includes('bad experience') || summaryLower.includes('poor experience')) {
            extractedFields.disappointments = {
                value: 'Previous experience',
                confidence: 85,
                source: 'direct_extraction'
            };
        } else if (summaryLower.includes('challenge') || summaryLower.includes('difficult') || summaryLower.includes('problem')) {
            extractedFields.disappointments = {
                value: 'Process challenges',
                confidence: 80,
                source: 'direct_extraction'
            };
        }

        // Concerns: Look for concern mentions with broader patterns
        if (summaryLower.includes('frustrated') && (summaryLower.includes('agent') || summaryLower.includes('calls'))) {
            extractedFields.concerns = {
                value: 'Agent calls',
                confidence: 90,
                source: 'direct_extraction'
            };
        } else if (summaryLower.includes('concern') || summaryLower.includes('worried') || summaryLower.includes('worry')) {
            if (summaryLower.includes('buyer') || summaryLower.includes('quality')) {
                extractedFields.concerns = {
                    value: 'Buyer quality',
                    confidence: 90,
                    source: 'direct_extraction'
                };
            } else if (summaryLower.includes('price') || summaryLower.includes('pricing')) {
                extractedFields.concerns = {
                    value: 'Pricing',
                    confidence: 90,
                    source: 'direct_extraction'
                };
            } else if (summaryLower.includes('timing') || summaryLower.includes('time')) {
                extractedFields.concerns = {
                    value: 'Timing',
                    confidence: 85,
                    source: 'direct_extraction'
                };
            } else if (summaryLower.includes('market') || summaryLower.includes('selling')) {
                extractedFields.concerns = {
                    value: 'Market conditions',
                    confidence: 85,
                    source: 'direct_extraction'
                };
            }
        } else if (summaryLower.includes('unsure') || summaryLower.includes('uncertain')) {
            extractedFields.concerns = {
                value: 'Uncertainty',
                confidence: 80,
                source: 'direct_extraction'
            };
        } else if (summaryLower.includes('agent') && (summaryLower.includes('frustrated') || summaryLower.includes('calls'))) {
            extractedFields.concerns = {
                value: 'Agent interactions',
                confidence: 85,
                source: 'direct_extraction'
            };
        }

        // Openness to Re-list: Look for agent openness mentions
        if (summaryLower.includes('open to') && summaryLower.includes('agent') && summaryLower.includes('buyer') && summaryLower.includes('commission')) {
            extractedFields.opennessToRelist = {
                value: 'Yes, if buyer pays commission',
                confidence: 90,
                source: 'direct_extraction'
            };
        } else if (summaryLower.includes('open to working with') && summaryLower.includes('agent')) {
            extractedFields.opennessToRelist = {
                value: 'Yes, open to agent',
                confidence: 85,
                source: 'direct_extraction'
            };
        }

        return extractedFields;
    }

    // Main extraction method
    async extractFromSummary(summary) {
        console.log('🎯 Using simple question-based mapping');
        const extractedFields = {};

        // Try question-based extraction first
        let questionFieldsFound = 0;
        for (const [fieldKey, mapping] of this.questionMappings) {
            try {
                const result = this.extractFieldFromSummary(summary, fieldKey);
                if (result) {
                    extractedFields[fieldKey] = result;
                    questionFieldsFound++;
                }
            } catch (error) {
                console.error(`❌ Error extracting ${mapping.fieldName}:`, error.message);
            }
        }

        // If no questions found, use direct extraction
        if (questionFieldsFound === 0) {
            console.log('🔄 No questions found in summary, using direct extraction');
            const directFields = this.extractDirectFromSummary(summary);
            Object.assign(extractedFields, directFields);
        }

        // Add system fields
        extractedFields['Last Contact'] = {
            value: new Date().toISOString().split('T')[0],
            confidence: 100,
            source: 'system'
        };

        extractedFields['latest Call Summary'] = {
            value: summary,
            confidence: 100,
            source: 'system'
        };

        console.log(`✅ Question-based extraction completed: ${Object.keys(extractedFields).length} fields`);
        return extractedFields;
    }
}
/**
 * Natural Language Query Engine
 * 
 * Enables users to generate reports and extract insights using natural language
 * queries with support for multiple languages and complex business intelligence.
 */
class NaturalLanguageQueryEngine {
    constructor() {
        this.queryProcessor = new QueryProcessor();
        this.languageModels = new Map();
        this.queryTemplates = new Map();
        this.contextMemory = new Map();
        this.entityExtractor = new EntityExtractor();
        this.reportGenerator = new ReportGenerator();
        
        // Initialize language support
        this.initializeLanguageModels();
        this.initializeQueryTemplates();
        this.initializeEntityRecognition();
        
        console.log('🗣️ Natural Language Query Engine initialized with multi-language support');
    }

    /**
     * Initialize language models for different locales
     */
    initializeLanguageModels() {
        const models = [
            {
                language: 'en',
                name: 'English',
                patterns: {
                    timeFilters: [
                        /last\s+(\d+)\s+(day|week|month|year)s?/i,
                        /(this|last|next)\s+(week|month|quarter|year)/i,
                        /between\s+(.+?)\s+and\s+(.+)/i,
                        /(yesterday|today|tomorrow)/i
                    ],
                    amountFilters: [
                        /(greater|more|above)\s+than\s+(\d+)/i,
                        /(less|below|under)\s+than\s+(\d+)/i,
                        /between\s+(\d+)\s+and\s+(\d+)/i,
                        /exactly\s+(\d+)/i
                    ],
                    aggregations: [
                        /(total|sum|amount)\s+(of|for)?/i,
                        /(average|mean)\s+(of|for)?/i,
                        /(count|number)\s+(of|for)?/i,
                        /(maximum|max|highest)\s+(of|for)?/i,
                        /(minimum|min|lowest)\s+(of|for)?/i
                    ],
                    categories: [
                        /travel|trip|flight|hotel|accommodation/i,
                        /meal|food|restaurant|dining/i,
                        /office|supplies|equipment|stationery/i,
                        /software|license|subscription|saas/i,
                        /marketing|advertising|promotion/i
                    ],
                    grouping: [
                        /group\s+by\s+(day|week|month|year|category|user|department)/i,
                        /breakdown\s+by\s+(day|week|month|year|category|user|department)/i,
                        /per\s+(day|week|month|year|category|user|department)/i
                    ]
                }
            },
            {
                language: 'pl',
                name: 'Polski',
                patterns: {
                    timeFilters: [
                        /ostatni[eąch]?\s+(\d+)\s+(dzień|dni|tydzień|tygodni|miesiąc|miesięcy|rok|lat)/i,
                        /(ten|ostatni|przyszły)\s+(tydzień|miesiąc|kwartał|rok)/i,
                        /między\s+(.+?)\s+(a|i)\s+(.+)/i,
                        /(wczoraj|dzisiaj|jutro)/i
                    ],
                    amountFilters: [
                        /(większ[eya]|więcej|powyżej)\s+(niż|od)\s+(\d+)/i,
                        /(mniejsz[eya]|mniej|poniżej)\s+(niż|od)\s+(\d+)/i,
                        /między\s+(\d+)\s+(a|i)\s+(\d+)/i,
                        /dokładnie\s+(\d+)/i
                    ],
                    aggregations: [
                        /(suma|łącznie|razem)/i,
                        /(średnia|średnio)/i,
                        /(liczba|ilość)/i,
                        /(maksimum|najwyższ[eya]|największ[eya])/i,
                        /(minimum|najniższ[eya]|najmniejsz[eya])/i
                    ],
                    categories: [
                        /podróż|wyjazd|lot|hotel|nocleg/i,
                        /posiłek|jedzenie|restauracja|obiad/i,
                        /biuro|materiały|wyposażenie/i,
                        /oprogramowanie|licencja|subskrypcja/i,
                        /marketing|reklama|promocja/i
                    ]
                }
            },
            {
                language: 'de',
                name: 'Deutsch',
                patterns: {
                    timeFilters: [
                        /letzt[en]?\s+(\d+)\s+(tag|tage|woche|wochen|monat|monate|jahr|jahre)/i,
                        /(dies[er]?|letzt[er]?|nächst[er]?)\s+(woche|monat|quartal|jahr)/i,
                        /zwischen\s+(.+?)\s+und\s+(.+)/i,
                        /(gestern|heute|morgen)/i
                    ],
                    amountFilters: [
                        /(größer|mehr|über)\s+(als)?\s+(\d+)/i,
                        /(kleiner|weniger|unter)\s+(als)?\s+(\d+)/i,
                        /zwischen\s+(\d+)\s+und\s+(\d+)/i,
                        /genau\s+(\d+)/i
                    ],
                    aggregations: [
                        /(summe|gesamt|total)/i,
                        /(durchschnitt|mittelwert)/i,
                        /(anzahl|zahl)/i,
                        /(maximum|höchst[er]?|größt[er]?)/i,
                        /(minimum|niedrigst[er]?|kleinst[er]?)/i
                    ],
                    categories: [
                        /reise|fahrt|flug|hotel|unterkunft/i,
                        /mahlzeit|essen|restaurant/i,
                        /büro|material|ausstattung/i,
                        /software|lizenz|abonnement/i,
                        /marketing|werbung|promotion/i
                    ]
                }
            }
        ];

        models.forEach(model => {
            this.languageModels.set(model.language, model);
        });
    }

    /**
     * Initialize common query templates
     */
    initializeQueryTemplates() {
        const templates = [
            {
                id: 'expense_summary',
                patterns: [
                    'show me expenses',
                    'expense summary',
                    'wydatki podsumowanie',
                    'ausgaben übersicht'
                ],
                intent: 'EXPENSE_SUMMARY',
                defaultParameters: {
                    timeframe: 'current_month',
                    groupBy: 'category'
                }
            },
            {
                id: 'top_spenders',
                patterns: [
                    'who spent the most',
                    'top spenders',
                    'kto wydał najwięcej',
                    'wer hat am meisten ausgegeben'
                ],
                intent: 'TOP_SPENDERS',
                defaultParameters: {
                    limit: 10,
                    timeframe: 'current_month'
                }
            },
            {
                id: 'budget_variance',
                patterns: [
                    'budget vs actual',
                    'budget variance',
                    'budżet kontra rzeczywistość',
                    'budget abweichung'
                ],
                intent: 'BUDGET_VARIANCE',
                defaultParameters: {
                    timeframe: 'current_month',
                    showVariance: true
                }
            },
            {
                id: 'compliance_report',
                patterns: [
                    'compliance status',
                    'policy violations',
                    'status zgodności',
                    'compliance bericht'
                ],
                intent: 'COMPLIANCE_REPORT',
                defaultParameters: {
                    includeViolations: true,
                    timeframe: 'current_quarter'
                }
            }
        ];

        templates.forEach(template => {
            this.queryTemplates.set(template.id, template);
        });
    }

    /**
     * Initialize entity recognition patterns
     */
    initializeEntityRecognition() {
        this.entityExtractor.addEntityType('AMOUNT', {
            patterns: [
                /(\d+(?:\.\d+)?)\s*(dollars?|usd|\$)/i,
                /(\d+(?:,\d+)?)\s*(euros?|eur|€)/i,
                /(\d+(?:,\d+)?)\s*(pln|zł|złoty|złotych)/i,
                /(\d+(?:,\d+)?)\s*(czk|koruna|korun)/i,
                /(\d+(?:,\d+)?)\s*(gbp|pounds?|£)/i
            ],
            extractor: (match) => ({
                value: parseFloat(match[1].replace(',', '')),
                currency: this.normalizeCurrency(match[2])
            })
        });

        this.entityExtractor.addEntityType('DATE', {
            patterns: [
                /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/,
                /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/,
                /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/i,
                /(styczeń|luty|marzec|kwiecień|maj|czerwiec|lipiec|sierpień|wrzesień|październik|listopad|grudzień)\s+(\d{1,2}),?\s+(\d{4})/i
            ],
            extractor: (match) => {
                return this.parseDate(match[0]);
            }
        });

        this.entityExtractor.addEntityType('USER', {
            patterns: [
                /user\s+([a-zA-Z]+)/i,
                /employee\s+([a-zA-Z]+)/i,
                /użytkownik\s+([a-zA-Z]+)/i,
                /pracownik\s+([a-zA-Z]+)/i,
                /mitarbeiter\s+([a-zA-Z]+)/i
            ],
            extractor: (match) => match[1]
        });

        this.entityExtractor.addEntityType('CATEGORY', {
            patterns: [
                /(travel|trip|flight|hotel)/i,
                /(meal|food|restaurant|dining)/i,
                /(office|supplies|equipment)/i,
                /(software|license|subscription)/i,
                /(podróż|wyjazd|lot|hotel)/i,
                /(posiłek|jedzenie|restauracja)/i,
                /(reise|fahrt|flug|hotel)/i,
                /(mahlzeit|essen|restaurant)/i
            ],
            extractor: (match) => this.normalizeCategory(match[1])
        });
    }

    /**
     * Process natural language query
     */
    async processQuery(queryText, userId, language = 'en', context = {}) {
        try {
            // Store conversation context
            const sessionId = context.sessionId || this.generateSessionId();
            this.updateContext(sessionId, queryText, context);

            // Detect language if not specified
            if (language === 'auto') {
                language = await this.detectLanguage(queryText);
            }

            // Parse the query
            const parsedQuery = await this.parseQuery(queryText, language);
            
            // Extract entities
            const entities = this.entityExtractor.extractEntities(queryText);
            
            // Determine intent
            const intent = await this.determineIntent(parsedQuery, entities, language);
            
            // Generate SQL/data query
            const dataQuery = await this.generateDataQuery(intent, entities, parsedQuery);
            
            // Execute query and get results
            const results = await this.executeQuery(dataQuery, userId);
            
            // Generate natural language response
            const response = await this.generateResponse(results, intent, language, queryText);
            
            // Store interaction for learning
            await this.storeInteraction({
                sessionId,
                query: queryText,
                language,
                intent,
                entities,
                results,
                response,
                userId,
                timestamp: new Date()
            });

            return {
                sessionId,
                query: queryText,
                language,
                intent: intent.type,
                confidence: intent.confidence,
                entities,
                results,
                response: response.text,
                visualizations: response.visualizations,
                followupSuggestions: response.suggestions,
                executionTime: Date.now() - (context.startTime || Date.now())
            };

        } catch (error) {
            return {
                error: true,
                message: error.message,
                suggestion: 'Try rephrasing your question or ask for help with available commands.'
            };
        }
    }

    /**
     * Parse natural language query
     */
    async parseQuery(queryText, language) {
        const model = this.languageModels.get(language);
        if (!model) {
            throw new Error(`Unsupported language: ${language}`);
        }

        const parsed = {
            text: queryText.toLowerCase(),
            language,
            filters: {
                time: [],
                amount: [],
                category: [],
                user: []
            },
            aggregations: [],
            grouping: [],
            sorting: [],
            limit: null
        };

        // Extract time filters
        for (const pattern of model.patterns.timeFilters) {
            const match = queryText.match(pattern);
            if (match) {
                parsed.filters.time.push(this.parseTimeFilter(match, language));
            }
        }

        // Extract amount filters
        for (const pattern of model.patterns.amountFilters) {
            const match = queryText.match(pattern);
            if (match) {
                parsed.filters.amount.push(this.parseAmountFilter(match));
            }
        }

        // Extract aggregations
        for (const pattern of model.patterns.aggregations) {
            const match = queryText.match(pattern);
            if (match) {
                parsed.aggregations.push(this.parseAggregation(match, language));
            }
        }

        // Extract grouping
        if (model.patterns.grouping) {
            for (const pattern of model.patterns.grouping) {
                const match = queryText.match(pattern);
                if (match) {
                    parsed.grouping.push(match[1].toLowerCase());
                }
            }
        }

        return parsed;
    }

    /**
     * Determine query intent
     */
    async determineIntent(parsedQuery, entities, language) {
        const intentScores = new Map();

        // Check against templates
        for (const [id, template] of this.queryTemplates) {
            let score = 0;
            
            for (const pattern of template.patterns) {
                if (parsedQuery.text.includes(pattern.toLowerCase())) {
                    score += 10;
                }
            }

            // Score based on entities and filters
            if (parsedQuery.aggregations.length > 0) score += 5;
            if (parsedQuery.filters.time.length > 0) score += 3;
            if (parsedQuery.filters.amount.length > 0) score += 3;
            if (entities.length > 0) score += 2;

            if (score > 0) {
                intentScores.set(template.intent, score);
            }
        }

        // Determine best intent
        let bestIntent = 'GENERAL_QUERY';
        let bestScore = 0;
        
        for (const [intent, score] of intentScores) {
            if (score > bestScore) {
                bestIntent = intent;
                bestScore = score;
            }
        }

        return {
            type: bestIntent,
            confidence: Math.min(bestScore / 10, 1.0),
            alternatives: Array.from(intentScores.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([intent, score]) => ({ intent, confidence: score / 10 }))
        };
    }

    /**
     * Generate data query from parsed intent
     */
    async generateDataQuery(intent, entities, parsedQuery) {
        const query = {
            type: intent.type,
            tables: ['expenses'],
            select: [],
            where: [],
            groupBy: [],
            orderBy: [],
            limit: null
        };

        // Build SELECT clause based on intent
        switch (intent.type) {
            case 'EXPENSE_SUMMARY':
                query.select = ['category', 'SUM(amount) as total', 'COUNT(*) as count'];
                query.groupBy = ['category'];
                break;
            
            case 'TOP_SPENDERS':
                query.select = ['user_id', 'user_name', 'SUM(amount) as total'];
                query.groupBy = ['user_id', 'user_name'];
                query.orderBy = ['total DESC'];
                query.limit = 10;
                break;
            
            case 'BUDGET_VARIANCE':
                query.tables = ['expenses', 'budgets'];
                query.select = ['category', 'SUM(amount) as actual', 'budget_amount', '(budget_amount - SUM(amount)) as variance'];
                query.groupBy = ['category', 'budget_amount'];
                break;
                
            default:
                query.select = ['*'];
        }

        // Add WHERE clauses from filters
        for (const timeFilter of parsedQuery.filters.time) {
            query.where.push(this.buildTimeWhereClause(timeFilter));
        }

        for (const amountFilter of parsedQuery.filters.amount) {
            query.where.push(this.buildAmountWhereClause(amountFilter));
        }

        // Add entity filters
        for (const entity of entities) {
            switch (entity.type) {
                case 'CATEGORY':
                    query.where.push(`category = '${entity.value}'`);
                    break;
                case 'USER':
                    query.where.push(`user_name LIKE '%${entity.value}%'`);
                    break;
                case 'AMOUNT':
                    if (entity.currency) {
                        query.where.push(`currency = '${entity.currency}'`);
                    }
                    break;
            }
        }

        return query;
    }

    /**
     * Execute the generated query
     */
    async executeQuery(dataQuery, userId) {
        // Mock query execution - in real implementation, this would connect to the database
        const mockResults = await this.generateMockResults(dataQuery);
        
        // Apply any post-processing
        return this.processQueryResults(mockResults, dataQuery);
    }

    /**
     * Generate natural language response
     */
    async generateResponse(results, intent, language, originalQuery) {
        const responseGenerator = new ResponseGenerator(language);
        
        const response = {
            text: '',
            visualizations: [],
            suggestions: []
        };

        switch (intent.type) {
            case 'EXPENSE_SUMMARY':
                response.text = responseGenerator.generateExpenseSummary(results);
                response.visualizations = ['pie_chart', 'bar_chart'];
                response.suggestions = [
                    'Show me travel expenses only',
                    'What about last quarter?',
                    'Who spent the most on travel?'
                ];
                break;
                
            case 'TOP_SPENDERS':
                response.text = responseGenerator.generateTopSpenders(results);
                response.visualizations = ['bar_chart', 'table'];
                response.suggestions = [
                    'Show me their expense breakdown',
                    'Compare with last month',
                    'Show only travel expenses'
                ];
                break;
                
            case 'BUDGET_VARIANCE':
                response.text = responseGenerator.generateBudgetVariance(results);
                response.visualizations = ['comparison_chart', 'variance_chart'];
                response.suggestions = [
                    'Show me the biggest overruns',
                    'What caused the variance?',
                    'Show monthly trends'
                ];
                break;
                
            default:
                response.text = responseGenerator.generateGenericResponse(results);
                response.visualizations = ['table'];
                response.suggestions = [
                    'Can you show me a chart?',
                    'Group this by category',
                    'Show me more details'
                ];
        }

        return response;
    }

    // Context management
    updateContext(sessionId, query, context) {
        if (!this.contextMemory.has(sessionId)) {
            this.contextMemory.set(sessionId, {
                queries: [],
                preferences: {},
                entities: new Map()
            });
        }
        
        const session = this.contextMemory.get(sessionId);
        session.queries.push({
            text: query,
            timestamp: new Date(),
            context
        });
        
        // Keep only last 10 queries
        if (session.queries.length > 10) {
            session.queries = session.queries.slice(-10);
        }
    }

    // Utility methods
    generateSessionId() {
        return `nlq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async detectLanguage(text) {
        // Simple language detection based on keywords
        const polishKeywords = ['wydatki', 'koszt', 'faktura', 'podsumowanie', 'budżet'];
        const germanKeywords = ['ausgaben', 'kosten', 'rechnung', 'übersicht', 'budget'];
        
        const lowerText = text.toLowerCase();
        
        if (polishKeywords.some(keyword => lowerText.includes(keyword))) {
            return 'pl';
        }
        
        if (germanKeywords.some(keyword => lowerText.includes(keyword))) {
            return 'de';
        }
        
        return 'en'; // Default to English
    }

    normalizeCurrency(currency) {
        const currencyMap = {
            'dollar': 'USD', 'dollars': 'USD', 'usd': 'USD', '$': 'USD',
            'euro': 'EUR', 'euros': 'EUR', 'eur': 'EUR', '€': 'EUR',
            'pln': 'PLN', 'zł': 'PLN', 'złoty': 'PLN', 'złotych': 'PLN',
            'czk': 'CZK', 'koruna': 'CZK', 'korun': 'CZK',
            'pound': 'GBP', 'pounds': 'GBP', 'gbp': 'GBP', '£': 'GBP'
        };
        
        return currencyMap[currency.toLowerCase()] || currency.toUpperCase();
    }

    normalizeCategory(category) {
        const categoryMap = {
            'travel': 'travel', 'trip': 'travel', 'flight': 'travel', 'hotel': 'travel',
            'podróż': 'travel', 'wyjazd': 'travel', 'lot': 'travel',
            'reise': 'travel', 'fahrt': 'travel', 'flug': 'travel',
            'meal': 'meals', 'food': 'meals', 'restaurant': 'meals', 'dining': 'meals',
            'posiłek': 'meals', 'jedzenie': 'meals', 'restauracja': 'meals',
            'mahlzeit': 'meals', 'essen': 'meals',
            'office': 'office', 'supplies': 'office', 'equipment': 'office',
            'software': 'software', 'license': 'software', 'subscription': 'software'
        };
        
        return categoryMap[category.toLowerCase()] || category.toLowerCase();
    }

    parseDate(dateString) {
        // Simple date parsing - in production, use a robust date library
        return new Date(dateString);
    }

    parseTimeFilter(match, language) {
        // Parse time filters based on language patterns
        return {
            type: 'relative',
            value: match[1] || match[0],
            unit: match[2] || 'day'
        };
    }

    parseAmountFilter(match) {
        return {
            operator: match[1].toLowerCase(),
            value: parseFloat(match[2] || match[3])
        };
    }

    parseAggregation(match, language) {
        const aggregationMap = {
            'total': 'SUM', 'sum': 'SUM', 'amount': 'SUM', 'suma': 'SUM', 'łącznie': 'SUM', 'summe': 'SUM',
            'average': 'AVG', 'mean': 'AVG', 'średnia': 'AVG', 'durchschnitt': 'AVG',
            'count': 'COUNT', 'number': 'COUNT', 'liczba': 'COUNT', 'anzahl': 'COUNT',
            'maximum': 'MAX', 'max': 'MAX', 'highest': 'MAX', 'najwyższ': 'MAX', 'największ': 'MAX',
            'minimum': 'MIN', 'min': 'MIN', 'lowest': 'MIN', 'najniższ': 'MIN', 'najmniejsz': 'MIN'
        };
        
        for (const [key, value] of Object.entries(aggregationMap)) {
            if (match[0].toLowerCase().includes(key)) {
                return value;
            }
        }
        
        return 'SUM'; // Default
    }

    buildTimeWhereClause(timeFilter) {
        // Build SQL WHERE clause for time filters
        switch (timeFilter.type) {
            case 'relative':
                return `date >= DATE_SUB(NOW(), INTERVAL ${timeFilter.value} ${timeFilter.unit.toUpperCase()})`;
            default:
                return `date >= '${timeFilter.value}'`;
        }
    }

    buildAmountWhereClause(amountFilter) {
        switch (amountFilter.operator) {
            case 'greater':
            case 'more':
            case 'above':
                return `amount > ${amountFilter.value}`;
            case 'less':
            case 'below':
            case 'under':
                return `amount < ${amountFilter.value}`;
            case 'exactly':
                return `amount = ${amountFilter.value}`;
            default:
                return `amount >= ${amountFilter.value}`;
        }
    }

    async generateMockResults(dataQuery) {
        // Generate realistic mock data based on query type
        switch (dataQuery.type) {
            case 'EXPENSE_SUMMARY':
                return [
                    { category: 'travel', total: 15000, count: 45 },
                    { category: 'meals', total: 8500, count: 123 },
                    { category: 'office', total: 3200, count: 67 },
                    { category: 'software', total: 2100, count: 12 }
                ];
                
            case 'TOP_SPENDERS':
                return [
                    { user_id: '1', user_name: 'John Smith', total: 8500 },
                    { user_id: '2', user_name: 'Sarah Johnson', total: 7200 },
                    { user_id: '3', user_name: 'Mike Wilson', total: 6800 },
                    { user_id: '4', user_name: 'Anna Kowalski', total: 5900 }
                ];
                
            case 'BUDGET_VARIANCE':
                return [
                    { category: 'travel', actual: 15000, budget_amount: 12000, variance: -3000 },
                    { category: 'meals', actual: 8500, budget_amount: 10000, variance: 1500 },
                    { category: 'office', actual: 3200, budget_amount: 5000, variance: 1800 }
                ];
                
            default:
                return [
                    { id: 1, amount: 250, category: 'travel', date: '2024-01-15', user: 'John Smith' },
                    { id: 2, amount: 85, category: 'meals', date: '2024-01-14', user: 'Sarah Johnson' }
                ];
        }
    }

    processQueryResults(results, dataQuery) {
        // Apply any additional processing to results
        if (dataQuery.limit) {
            results = results.slice(0, dataQuery.limit);
        }
        
        return results;
    }

    async storeInteraction(interaction) {
        // Store interaction for machine learning and improvement
        console.log('📝 NLQ Interaction stored:', interaction.query);
        return true;
    }
}

/**
 * Entity Extractor for recognizing entities in natural language
 */
class EntityExtractor {
    constructor() {
        this.entityTypes = new Map();
    }

    addEntityType(name, config) {
        this.entityTypes.set(name, config);
    }

    extractEntities(text) {
        const entities = [];
        
        for (const [type, config] of this.entityTypes) {
            for (const pattern of config.patterns) {
                const matches = text.matchAll(new RegExp(pattern, 'gi'));
                
                for (const match of matches) {
                    try {
                        const value = config.extractor(match);
                        entities.push({
                            type,
                            value,
                            text: match[0],
                            start: match.index,
                            end: match.index + match[0].length
                        });
                    } catch (error) {
                        // Skip invalid extractions
                    }
                }
            }
        }
        
        return entities;
    }
}

/**
 * Response Generator for creating natural language responses
 */
class ResponseGenerator {
    constructor(language = 'en') {
        this.language = language;
        this.templates = this.initializeTemplates();
    }

    initializeTemplates() {
        return {
            en: {
                expense_summary: "Here's your expense summary: {summary}. Total spent: {total} across {categories} categories.",
                top_spenders: "Top spenders: {spenders}. The highest spender is {top_spender} with {amount}.",
                budget_variance: "Budget analysis: {analysis}. Overall you're {status} budget by {variance}.",
                no_results: "I couldn't find any data matching your criteria. Try adjusting your filters."
            },
            pl: {
                expense_summary: "Oto podsumowanie wydatków: {summary}. Łącznie wydano: {total} w {categories} kategoriach.",
                top_spenders: "Najwięcej wydali: {spenders}. Największe wydatki ma {top_spender} z kwotą {amount}.",
                budget_variance: "Analiza budżetu: {analysis}. Ogólnie {status} budżet o {variance}.",
                no_results: "Nie znalazłem danych spełniających Twoje kryteria. Spróbuj zmienić filtry."
            },
            de: {
                expense_summary: "Hier ist Ihre Ausgabenübersicht: {summary}. Gesamt ausgegeben: {total} in {categories} Kategorien.",
                top_spenders: "Top-Ausgeber: {spenders}. Der höchste Ausgeber ist {top_spender} mit {amount}.",
                budget_variance: "Budget-Analyse: {analysis}. Insgesamt sind Sie {status} Budget um {variance}.",
                no_results: "Ich konnte keine Daten finden, die Ihren Kriterien entsprechen. Versuchen Sie, Ihre Filter anzupassen."
            }
        };
    }

    generateExpenseSummary(results) {
        const template = this.templates[this.language]?.expense_summary || this.templates.en.expense_summary;
        const total = results.reduce((sum, item) => sum + item.total, 0);
        const categories = results.length;
        
        return template
            .replace('{summary}', results.map(r => `${r.category}: ${r.total}`).join(', '))
            .replace('{total}', total.toLocaleString())
            .replace('{categories}', categories);
    }

    generateTopSpenders(results) {
        const template = this.templates[this.language]?.top_spenders || this.templates.en.top_spenders;
        const topSpender = results[0];
        
        return template
            .replace('{spenders}', results.slice(0, 3).map(r => r.user_name).join(', '))
            .replace('{top_spender}', topSpender.user_name)
            .replace('{amount}', topSpender.total.toLocaleString());
    }

    generateBudgetVariance(results) {
        const template = this.templates[this.language]?.budget_variance || this.templates.en.budget_variance;
        const totalVariance = results.reduce((sum, item) => sum + item.variance, 0);
        const status = totalVariance > 0 ? 'under' : 'over';
        
        return template
            .replace('{analysis}', results.map(r => `${r.category}: ${r.variance > 0 ? '+' : ''}${r.variance}`).join(', '))
            .replace('{status}', status)
            .replace('{variance}', Math.abs(totalVariance).toLocaleString());
    }

    generateGenericResponse(results) {
        if (results.length === 0) {
            return this.templates[this.language]?.no_results || this.templates.en.no_results;
        }
        
        return `Found ${results.length} results. Here are the details: ${JSON.stringify(results.slice(0, 5), null, 2)}`;
    }
}

/**
 * Query Processor for handling complex query logic
 */
class QueryProcessor {
    constructor() {
        this.cache = new Map();
        this.queryHistory = [];
    }

    async processAdvancedQuery(query, context) {
        // Handle complex multi-step queries
        return query;
    }
}

/**
 * Report Generator for creating structured reports from NLQ results
 */
class ReportGenerator {
    constructor() {
        this.templates = new Map();
    }

    async generateReport(results, intent, format = 'json') {
        // Generate formatted reports from query results
        return {
            format,
            data: results,
            metadata: { intent, generated: new Date() }
        };
    }
}

module.exports = NaturalLanguageQueryEngine; 
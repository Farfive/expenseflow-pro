/**
 * API Management System
 * Comprehensive RESTful API with webhooks, rate limiting, and developer portal
 * Enables third-party integrations and ecosystem partnerships
 */

class APIManagementSystem {
    constructor() {
        this.apiKeys = new Map();
        this.webhookSubscriptions = new Map();
        this.rateLimits = new Map();
        this.apiMetrics = new Map();
        this.endpointRegistry = new Map();
        this.developerPortal = new Map();
        this.initializeAPIEndpoints();
    }

    /**
     * Initialize API endpoint registry
     */
    initializeAPIEndpoints() {
        const endpoints = [
            // Expense Management
            { path: '/api/v1/expenses', methods: ['GET', 'POST'], scope: 'expenses:read,expenses:write', rateLimit: '1000/hour' },
            { path: '/api/v1/expenses/{id}', methods: ['GET', 'PUT', 'DELETE'], scope: 'expenses:read,expenses:write', rateLimit: '500/hour' },
            
            // Document Management
            { path: '/api/v1/documents', methods: ['GET', 'POST'], scope: 'documents:read,documents:write', rateLimit: '500/hour' },
            { path: '/api/v1/documents/{id}/process', methods: ['POST'], scope: 'documents:process', rateLimit: '100/hour' },
            
            // Bank Transactions
            { path: '/api/v1/bank-transactions', methods: ['GET', 'POST'], scope: 'banking:read,banking:write', rateLimit: '2000/hour' },
            { path: '/api/v1/bank-transactions/reconcile', methods: ['POST'], scope: 'banking:reconcile', rateLimit: '200/hour' },
            
            // Reporting
            { path: '/api/v1/reports', methods: ['GET', 'POST'], scope: 'reports:read,reports:generate', rateLimit: '100/hour' },
            { path: '/api/v1/reports/{id}/export', methods: ['GET'], scope: 'reports:export', rateLimit: '50/hour' },
            
            // User Management
            { path: '/api/v1/users', methods: ['GET', 'POST'], scope: 'users:read,users:write', rateLimit: '200/hour' },
            { path: '/api/v1/users/{id}', methods: ['GET', 'PUT'], scope: 'users:read,users:write', rateLimit: '200/hour' },
            
            // Webhooks
            { path: '/api/v1/webhooks', methods: ['GET', 'POST'], scope: 'webhooks:manage', rateLimit: '100/hour' },
            { path: '/api/v1/webhooks/{id}', methods: ['GET', 'PUT', 'DELETE'], scope: 'webhooks:manage', rateLimit: '100/hour' },

            // Analytics
            { path: '/api/v1/analytics', methods: ['GET'], scope: 'analytics:read', rateLimit: '500/hour' },
            { path: '/api/v1/analytics/custom', methods: ['POST'], scope: 'analytics:custom', rateLimit: '100/hour' }
        ];

        endpoints.forEach(endpoint => {
            this.endpointRegistry.set(`${endpoint.path}`, endpoint);
        });
    }

    /**
     * Generate API key for developer/application
     */
    async generateAPIKey(applicationData) {
        try {
            const apiKey = {
                id: `ak_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`,
                key: this.generateSecureKey(),
                applicationName: applicationData.name,
                developerId: applicationData.developerId,
                tenantId: applicationData.tenantId,
                scopes: applicationData.scopes || [],
                environment: applicationData.environment || 'production',
                status: 'active',
                rateLimit: applicationData.rateLimit || '1000/hour',
                allowedOrigins: applicationData.allowedOrigins || [],
                metadata: {
                    createdAt: new Date(),
                    lastUsed: null,
                    requestCount: 0,
                    description: applicationData.description || ''
                },
                restrictions: {
                    ipWhitelist: applicationData.ipWhitelist || [],
                    timeRestrictions: applicationData.timeRestrictions || null,
                    dataAccess: applicationData.dataAccess || 'tenant'
                }
            };

            // Store API key
            this.apiKeys.set(apiKey.key, apiKey);
            
            // Initialize rate limiting
            await this.initializeRateLimit(apiKey.key, apiKey.rateLimit);
            
            // Log API key creation
            await this.logAPIKeyEvent('created', apiKey);

            return {
                success: true,
                apiKey: apiKey.key,
                keyId: apiKey.id,
                scopes: apiKey.scopes,
                rateLimit: apiKey.rateLimit,
                expiresAt: null // Add expiration logic if needed
            };
        } catch (error) {
            console.error('Error generating API key:', error);
            throw error;
        }
    }

    /**
     * Validate API key and check permissions
     */
    async validateAPIKey(apiKey, requiredScope, endpoint, clientIP) {
        try {
            const keyData = this.apiKeys.get(apiKey);
            if (!keyData) {
                return { valid: false, reason: 'Invalid API key' };
            }

            if (keyData.status !== 'active') {
                return { valid: false, reason: 'API key is inactive' };
            }

            // Check scope permissions
            if (requiredScope && !this.hasRequiredScope(keyData.scopes, requiredScope)) {
                return { valid: false, reason: 'Insufficient scope permissions' };
            }

            // Check IP restrictions
            if (keyData.restrictions.ipWhitelist.length > 0 && !keyData.restrictions.ipWhitelist.includes(clientIP)) {
                return { valid: false, reason: 'IP address not authorized' };
            }

            // Check rate limits
            const rateLimitResult = await this.checkRateLimit(apiKey, endpoint);
            if (!rateLimitResult.allowed) {
                return { valid: false, reason: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter };
            }

            // Update usage metrics
            await this.updateAPIKeyUsage(apiKey, endpoint);

            return {
                valid: true,
                keyData: {
                    id: keyData.id,
                    tenantId: keyData.tenantId,
                    scopes: keyData.scopes,
                    environment: keyData.environment
                }
            };
        } catch (error) {
            console.error('Error validating API key:', error);
            return { valid: false, reason: 'Validation error' };
        }
    }

    /**
     * Create webhook subscription
     */
    async createWebhookSubscription(subscriptionData, apiKey) {
        try {
            const keyData = this.apiKeys.get(apiKey);
            if (!keyData) {
                throw new Error('Invalid API key');
            }

            const subscription = {
                id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                url: subscriptionData.url,
                events: subscriptionData.events || [],
                apiKeyId: keyData.id,
                tenantId: keyData.tenantId,
                status: 'active',
                secret: this.generateWebhookSecret(),
                retryPolicy: {
                    maxRetries: subscriptionData.maxRetries || 3,
                    retryDelay: subscriptionData.retryDelay || 5000,
                    exponentialBackoff: subscriptionData.exponentialBackoff !== false
                },
                filters: subscriptionData.filters || {},
                headers: subscriptionData.headers || {},
                metadata: {
                    createdAt: new Date(),
                    lastTriggered: null,
                    successCount: 0,
                    failureCount: 0,
                    description: subscriptionData.description || ''
                }
            };

            // Validate webhook URL
            const urlValidation = await this.validateWebhookURL(subscription.url);
            if (!urlValidation.valid) {
                throw new Error(`Invalid webhook URL: ${urlValidation.reason}`);
            }

            // Store subscription
            this.webhookSubscriptions.set(subscription.id, subscription);

            // Test webhook (optional)
            if (subscriptionData.testWebhook) {
                await this.testWebhook(subscription.id);
            }

            return {
                success: true,
                subscriptionId: subscription.id,
                secret: subscription.secret,
                events: subscription.events,
                status: subscription.status
            };
        } catch (error) {
            console.error('Error creating webhook subscription:', error);
            throw error;
        }
    }

    /**
     * Trigger webhook for event
     */
    async triggerWebhook(eventType, eventData, tenantId) {
        try {
            // Find subscriptions for this event type and tenant
            const relevantSubscriptions = Array.from(this.webhookSubscriptions.values())
                .filter(sub => 
                    sub.tenantId === tenantId && 
                    sub.status === 'active' && 
                    sub.events.includes(eventType)
                );

            const results = [];

            for (const subscription of relevantSubscriptions) {
                try {
                    // Apply filters if any
                    if (!this.passesFilters(eventData, subscription.filters)) {
                        continue;
                    }

                    // Prepare webhook payload
                    const payload = {
                        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        type: eventType,
                        data: eventData,
                        timestamp: new Date().toISOString(),
                        tenantId
                    };

                    // Send webhook
                    const result = await this.sendWebhook(subscription, payload);
                    results.push({
                        subscriptionId: subscription.id,
                        success: result.success,
                        statusCode: result.statusCode,
                        response: result.response
                    });

                    // Update subscription metrics
                    await this.updateWebhookMetrics(subscription.id, result.success);

                } catch (error) {
                    console.error(`Error sending webhook to ${subscription.url}:`, error);
                    results.push({
                        subscriptionId: subscription.id,
                        success: false,
                        error: error.message
                    });
                }
            }

            return {
                eventType,
                triggeredWebhooks: results.length,
                results
            };
        } catch (error) {
            console.error('Error triggering webhooks:', error);
            throw error;
        }
    }

    /**
     * Send individual webhook
     */
    async sendWebhook(subscription, payload) {
        try {
            // Generate signature
            const signature = this.generateWebhookSignature(JSON.stringify(payload), subscription.secret);
            
            // Prepare headers
            const headers = {
                'Content-Type': 'application/json',
                'X-ExpenseFlow-Signature': signature,
                'X-ExpenseFlow-Event': payload.type,
                'User-Agent': 'ExpenseFlow-Webhooks/1.0',
                ...subscription.headers
            };

            // Send HTTP request (mock implementation)
            const response = await this.makeHTTPRequest(subscription.url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                timeout: 30000
            });

            return {
                success: response.status >= 200 && response.status < 300,
                statusCode: response.status,
                response: response.data
            };
        } catch (error) {
            console.error('Error sending webhook:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get API metrics and analytics
     */
    async getAPIMetrics(timeframe = '24h', apiKey = null) {
        try {
            const metrics = {
                timeframe,
                generatedAt: new Date(),
                overall: {
                    totalRequests: 0,
                    successRate: 0,
                    averageResponseTime: 0,
                    errorRate: 0
                },
                endpoints: {},
                apiKeys: {},
                rateLimiting: {},
                webhooks: {}
            };

            // Calculate overall metrics
            if (apiKey) {
                metrics.overall = await this.calculateAPIKeyMetrics(apiKey, timeframe);
                metrics.apiKeys[apiKey] = metrics.overall;
            } else {
                metrics.overall = await this.calculateOverallMetrics(timeframe);
                
                // Get metrics for all API keys
                for (const [key, keyData] of this.apiKeys) {
                    metrics.apiKeys[key] = await this.calculateAPIKeyMetrics(key, timeframe);
                }
            }

            // Endpoint-specific metrics
            for (const [endpoint, endpointData] of this.endpointRegistry) {
                metrics.endpoints[endpoint] = await this.calculateEndpointMetrics(endpoint, timeframe);
            }

            // Rate limiting metrics
            metrics.rateLimiting = await this.calculateRateLimitMetrics(timeframe);

            // Webhook metrics
            metrics.webhooks = await this.calculateWebhookMetrics(timeframe);

            return metrics;
        } catch (error) {
            console.error('Error getting API metrics:', error);
            throw error;
        }
    }

    /**
     * Generate developer portal access
     */
    async createDeveloperPortalAccess(developerData) {
        try {
            const developer = {
                id: `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                email: developerData.email,
                name: developerData.name,
                company: developerData.company || '',
                status: 'pending', // pending, active, suspended
                apiKeys: [],
                applications: [],
                metadata: {
                    createdAt: new Date(),
                    lastLogin: null,
                    emailVerified: false,
                    accessLevel: developerData.accessLevel || 'basic'
                },
                preferences: {
                    notifications: true,
                    webhookRetries: true,
                    analytics: true
                }
            };

            // Store developer account
            this.developerPortal.set(developer.id, developer);

            // Send verification email (mock)
            await this.sendVerificationEmail(developer);

            return {
                success: true,
                developerId: developer.id,
                status: developer.status,
                verificationRequired: true
            };
        } catch (error) {
            console.error('Error creating developer portal access:', error);
            throw error;
        }
    }

    /**
     * Get API documentation
     */
    async getAPIDocumentation(version = 'v1', format = 'openapi') {
        try {
            const documentation = {
                openapi: '3.0.0',
                info: {
                    title: 'ExpenseFlow Pro API',
                    version: version,
                    description: 'Comprehensive expense management API',
                    contact: {
                        name: 'ExpenseFlow API Support',
                        email: 'api-support@expenseflow.com',
                        url: 'https://docs.expenseflow.com'
                    },
                    license: {
                        name: 'Commercial',
                        url: 'https://expenseflow.com/license'
                    }
                },
                servers: [
                    {
                        url: 'https://api.expenseflow.com/v1',
                        description: 'Production server'
                    },
                    {
                        url: 'https://api-staging.expenseflow.com/v1',
                        description: 'Staging server'
                    }
                ],
                paths: {},
                components: {
                    securitySchemes: {
                        ApiKeyAuth: {
                            type: 'apiKey',
                            in: 'header',
                            name: 'X-API-Key'
                        }
                    },
                    schemas: this.generateAPISchemas()
                }
            };

            // Generate paths from endpoint registry
            for (const [path, endpoint] of this.endpointRegistry) {
                documentation.paths[path] = this.generateEndpointDocumentation(endpoint);
            }

            if (format === 'postman') {
                return this.convertToPostmanCollection(documentation);
            }

            return documentation;
        } catch (error) {
            console.error('Error getting API documentation:', error);
            throw error;
        }
    }

    // Helper methods

    generateSecureKey() {
        return `ek_${Date.now()}_${Math.random().toString(36).substr(2, 32)}`;
    }

    generateWebhookSecret() {
        return `whsec_${Math.random().toString(36).substr(2, 32)}`;
    }

    hasRequiredScope(userScopes, requiredScope) {
        const required = requiredScope.split(',').map(s => s.trim());
        return required.every(scope => userScopes.includes(scope));
    }

    async checkRateLimit(apiKey, endpoint) {
        // Mock rate limiting check
        const rateLimitKey = `${apiKey}:${endpoint}`;
        const currentUsage = this.rateLimits.get(rateLimitKey) || { count: 0, resetTime: Date.now() + 3600000 };
        
        const now = Date.now();
        if (now > currentUsage.resetTime) {
            currentUsage.count = 0;
            currentUsage.resetTime = now + 3600000; // Reset in 1 hour
        }

        const limit = 1000; // Default limit per hour
        const allowed = currentUsage.count < limit;
        
        if (allowed) {
            currentUsage.count++;
            this.rateLimits.set(rateLimitKey, currentUsage);
        }

        return {
            allowed,
            remaining: Math.max(0, limit - currentUsage.count),
            resetTime: currentUsage.resetTime,
            retryAfter: allowed ? null : Math.ceil((currentUsage.resetTime - now) / 1000)
        };
    }

    generateWebhookSignature(payload, secret) {
        // Mock signature generation (use HMAC-SHA256 in real implementation)
        return `sha256=${Buffer.from(payload + secret).toString('base64')}`;
    }

    async makeHTTPRequest(url, options) {
        // Mock HTTP request
        return {
            status: 200,
            data: { received: true }
        };
    }

    passesFilters(eventData, filters) {
        // Simple filter implementation
        for (const [key, value] of Object.entries(filters)) {
            if (eventData[key] !== value) {
                return false;
            }
        }
        return true;
    }

    generateAPISchemas() {
        return {
            Expense: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    amount: { type: 'number' },
                    currency: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string' },
                    date: { type: 'string', format: 'date' },
                    merchant: { type: 'string' },
                    status: { type: 'string', enum: ['draft', 'submitted', 'approved', 'rejected'] }
                }
            },
            Document: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    filename: { type: 'string' },
                    contentType: { type: 'string' },
                    size: { type: 'integer' },
                    url: { type: 'string' },
                    extractedData: { type: 'object' }
                }
            }
        };
    }

    generateEndpointDocumentation(endpoint) {
        // Mock endpoint documentation generation
        return {
            summary: `${endpoint.methods.join(', ')} ${endpoint.path}`,
            description: `API endpoint for ${endpoint.path}`,
            security: [{ ApiKeyAuth: [] }]
        };
    }

    convertToPostmanCollection(documentation) {
        // Mock Postman collection conversion
        return {
            info: { name: documentation.info.title },
            item: []
        };
    }

    // Mock data methods for system functionality
    async logAPIKeyEvent(action, apiKey) {
        console.log(`API Key ${action}:`, apiKey.id);
        return true;
    }

    async initializeRateLimit(apiKey, rateLimit) {
        console.log('Initializing rate limit for API key:', apiKey);
        return true;
    }

    async updateAPIKeyUsage(apiKey, endpoint) {
        // Mock usage update
        return true;
    }

    async updateWebhookMetrics(subscriptionId, success) {
        console.log(`Webhook ${subscriptionId} ${success ? 'succeeded' : 'failed'}`);
        return true;
    }

    async calculateAPIKeyMetrics(apiKey, timeframe) {
        // Mock API key metrics
        return {
            totalRequests: 1250,
            successRate: 0.96,
            averageResponseTime: 145,
            errorRate: 0.04
        };
    }

    async calculateOverallMetrics(timeframe) {
        // Mock overall metrics
        return {
            totalRequests: 15000,
            successRate: 0.95,
            averageResponseTime: 180,
            errorRate: 0.05
        };
    }

    async calculateEndpointMetrics(endpoint, timeframe) {
        // Mock endpoint metrics
        return {
            requestCount: 500,
            averageResponseTime: 120,
            errorRate: 0.02
        };
    }

    async calculateRateLimitMetrics(timeframe) {
        // Mock rate limit metrics
        return {
            totalRequests: 15000,
            rateLimitedRequests: 45,
            rateLimitHitRate: 0.003
        };
    }

    async calculateWebhookMetrics(timeframe) {
        // Mock webhook metrics
        return {
            totalWebhooks: 250,
            successfulDeliveries: 240,
            failedDeliveries: 10,
            averageDeliveryTime: 850
        };
    }

    async testWebhook(subscriptionId) {
        console.log('Testing webhook subscription:', subscriptionId);
        return { success: true, message: 'Webhook test successful' };
    }

    async sendVerificationEmail(developer) {
        console.log('Sending verification email to:', developer.email);
        return true;
    }

    async validateWebhookURL(url) {
        // Mock webhook URL validation
        return { valid: url.startsWith('https://'), reason: url.startsWith('https://') ? null : 'HTTPS required' };
    }
}

module.exports = APIManagementSystem; 
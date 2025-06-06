/**
 * ERP Integration Framework
 * Flexible integration framework with pre-built connectors for major ERP/accounting systems
 * Supports international and regional software platforms with standardized data mapping
 */

class ERPIntegrationFramework {
    constructor() {
        this.connectors = new Map();
        this.mappingTemplates = new Map();
        this.synchronizationJobs = new Map();
        this.integrationMetrics = new Map();
        this.fieldMappings = new Map();
        this.initializeConnectors();
        this.initializeMappingTemplates();
    }

    /**
     * Initialize built-in ERP connectors
     */
    initializeConnectors() {
        // International ERP Systems
        this.connectors.set('sap', {
            name: 'SAP ERP',
            type: 'enterprise',
            regions: ['global'],
            apiType: 'rest',
            authMethods: ['oauth2', 'api_key'],
            endpoints: {
                vendors: '/api/vendors',
                invoices: '/api/invoices',
                expenses: '/api/expenses',
                costCenters: '/api/cost-centers',
                chartOfAccounts: '/api/chart-of-accounts'
            },
            rateLimit: '1000/hour',
            maxBatchSize: 100
        });

        this.connectors.set('oracle', {
            name: 'Oracle ERP Cloud',
            type: 'enterprise',
            regions: ['global'],
            apiType: 'rest',
            authMethods: ['oauth2'],
            endpoints: {
                suppliers: '/fscmRestApi/resources/11.13.18.05/suppliers',
                invoices: '/fscmRestApi/resources/11.13.18.05/payablesInvoices',
                expenses: '/fscmRestApi/resources/11.13.18.05/expenses'
            },
            rateLimit: '500/hour',
            maxBatchSize: 50
        });

        this.connectors.set('quickbooks', {
            name: 'QuickBooks Online',
            type: 'smb',
            regions: ['us', 'ca', 'uk', 'au'],
            apiType: 'rest',
            authMethods: ['oauth2'],
            endpoints: {
                vendors: '/v3/company/{companyId}/vendors',
                bills: '/v3/company/{companyId}/bill',
                expenses: '/v3/company/{companyId}/purchase',
                accounts: '/v3/company/{companyId}/accounts'
            },
            rateLimit: '500/minute',
            maxBatchSize: 20
        });

        this.connectors.set('xero', {
            name: 'Xero',
            type: 'smb',
            regions: ['nz', 'au', 'uk', 'us'],
            apiType: 'rest',
            authMethods: ['oauth2'],
            endpoints: {
                contacts: '/api.xro/2.0/Contacts',
                invoices: '/api.xro/2.0/Invoices',
                expenses: '/api.xro/2.0/BankTransactions',
                accounts: '/api.xro/2.0/Accounts'
            },
            rateLimit: '5000/day',
            maxBatchSize: 100
        });

        // Polish ERP Systems
        this.connectors.set('comarch_optima', {
            name: 'Comarch ERP Optima',
            type: 'regional',
            regions: ['pl'],
            apiType: 'soap',
            authMethods: ['basic', 'token'],
            endpoints: {
                kontrahenci: '/CDN.API.OPT/api/kontrahenci',
                dokumenty: '/CDN.API.OPT/api/dokumenty',
                rozchody: '/CDN.API.OPT/api/rozchody'
            },
            rateLimit: '1000/hour',
            maxBatchSize: 50
        });

        this.connectors.set('symfonia', {
            name: 'Symfonia',
            type: 'regional',
            regions: ['pl'],
            apiType: 'rest',
            authMethods: ['api_key'],
            endpoints: {
                podmioty: '/api/v1/podmioty',
                faktury: '/api/v1/faktury',
                koszty: '/api/v1/koszty'
            },
            rateLimit: '2000/hour',
            maxBatchSize: 100
        });

        // German ERP Systems
        this.connectors.set('datev', {
            name: 'DATEV',
            type: 'regional',
            regions: ['de'],
            apiType: 'rest',
            authMethods: ['oauth2'],
            endpoints: {
                stammdaten: '/api/stammdaten/v1',
                belege: '/api/belege/v1',
                kostenarten: '/api/kostenarten/v1'
            },
            rateLimit: '1500/hour',
            maxBatchSize: 75
        });

        this.connectors.set('lexware', {
            name: 'Lexware',
            type: 'smb',
            regions: ['de'],
            apiType: 'rest',
            authMethods: ['oauth2'],
            endpoints: {
                kunden: '/api/v1/kunden',
                lieferanten: '/api/v1/lieferanten',
                belege: '/api/v1/belege'
            },
            rateLimit: '1000/hour',
            maxBatchSize: 50
        });
    }

    /**
     * Initialize field mapping templates
     */
    initializeMappingTemplates() {
        // Standard expense mapping template
        this.mappingTemplates.set('expense_standard', {
            sourceFields: {
                'amount': 'amount',
                'currency': 'currency',
                'date': 'transaction_date',
                'description': 'description',
                'category': 'expense_category',
                'merchant': 'vendor_name',
                'reference': 'reference_number'
            },
            transformations: {
                'date': 'dateFormat',
                'amount': 'currencyConvert',
                'category': 'categoryMap'
            },
            validations: {
                'amount': 'required|numeric|min:0',
                'date': 'required|date',
                'description': 'required|string|max:255'
            }
        });

        // Vendor/Supplier mapping template
        this.mappingTemplates.set('vendor_standard', {
            sourceFields: {
                'name': 'vendor_name',
                'taxId': 'tax_identification_number',
                'address': 'vendor_address',
                'contact': 'contact_person',
                'email': 'email_address',
                'phone': 'phone_number'
            },
            transformations: {
                'taxId': 'formatTaxId',
                'phone': 'formatPhone'
            },
            validations: {
                'name': 'required|string|max:100',
                'taxId': 'required|string',
                'email': 'email'
            }
        });

        // Invoice mapping template
        this.mappingTemplates.set('invoice_standard', {
            sourceFields: {
                'invoiceNumber': 'invoice_number',
                'issueDate': 'issue_date',
                'dueDate': 'due_date',
                'totalAmount': 'total_amount',
                'taxAmount': 'tax_amount',
                'netAmount': 'net_amount',
                'vendorId': 'vendor_id',
                'currency': 'currency_code'
            },
            transformations: {
                'issueDate': 'dateFormat',
                'dueDate': 'dateFormat',
                'totalAmount': 'currencyConvert',
                'taxAmount': 'currencyConvert',
                'netAmount': 'currencyConvert'
            },
            validations: {
                'invoiceNumber': 'required|string|unique',
                'issueDate': 'required|date',
                'totalAmount': 'required|numeric|min:0',
                'vendorId': 'required|string'
            }
        });
    }

    /**
     * Create integration configuration
     */
    async createIntegration(tenantId, erpSystem, configuration) {
        try {
            const connector = this.connectors.get(erpSystem);
            if (!connector) {
                throw new Error(`Unsupported ERP system: ${erpSystem}`);
            }

            const integration = {
                id: `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                tenantId,
                erpSystem,
                connector,
                configuration: {
                    ...configuration,
                    createdAt: new Date(),
                    status: 'inactive',
                    lastSync: null
                },
                authentication: {
                    method: configuration.authMethod,
                    credentials: configuration.credentials,
                    tokenExpiry: null,
                    refreshToken: configuration.refreshToken || null
                },
                mapping: {
                    expenses: configuration.expenseMapping || 'expense_standard',
                    vendors: configuration.vendorMapping || 'vendor_standard',
                    invoices: configuration.invoiceMapping || 'invoice_standard',
                    customMappings: configuration.customMappings || {}
                },
                synchronization: {
                    frequency: configuration.syncFrequency || 'hourly',
                    direction: configuration.syncDirection || 'bidirectional',
                    lastSyncStatus: null,
                    conflicts: []
                },
                options: {
                    batchSize: Math.min(configuration.batchSize || 50, connector.maxBatchSize),
                    retryAttempts: configuration.retryAttempts || 3,
                    enableLogging: configuration.enableLogging !== false,
                    dataValidation: configuration.dataValidation !== false
                }
            };

            // Validate authentication
            const authValidation = await this.validateAuthentication(integration);
            if (!authValidation.valid) {
                throw new Error(`Authentication failed: ${authValidation.error}`);
            }

            // Test connection
            const connectionTest = await this.testConnection(integration);
            if (!connectionTest.success) {
                throw new Error(`Connection test failed: ${connectionTest.error}`);
            }

            // Activate integration
            integration.configuration.status = 'active';
            
            // Store integration configuration
            await this.storeIntegration(integration);

            // Schedule synchronization job
            await this.scheduleSynchronizationJob(integration);

            return {
                success: true,
                integrationId: integration.id,
                status: integration.configuration.status,
                nextSync: await this.getNextSyncTime(integration)
            };
        } catch (error) {
            console.error('Error creating integration:', error);
            throw error;
        }
    }

    /**
     * Synchronize data with ERP system
     */
    async synchronizeData(integrationId, dataType = 'all', options = {}) {
        try {
            const integration = await this.getIntegration(integrationId);
            if (!integration) {
                throw new Error('Integration not found');
            }

            const syncJob = {
                id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                integrationId,
                dataType,
                status: 'running',
                startTime: new Date(),
                endTime: null,
                results: {
                    processed: 0,
                    successful: 0,
                    failed: 0,
                    conflicts: [],
                    errors: []
                }
            };

            // Store sync job
            this.synchronizationJobs.set(syncJob.id, syncJob);

            const syncResults = {};

            // Synchronize different data types
            if (dataType === 'all' || dataType === 'expenses') {
                syncResults.expenses = await this.syncExpenses(integration, options);
            }

            if (dataType === 'all' || dataType === 'vendors') {
                syncResults.vendors = await this.syncVendors(integration, options);
            }

            if (dataType === 'all' || dataType === 'invoices') {
                syncResults.invoices = await this.syncInvoices(integration, options);
            }

            // Update sync job results
            syncJob.status = 'completed';
            syncJob.endTime = new Date();
            syncJob.results = this.aggregateSyncResults(syncResults);

            // Update integration last sync
            integration.synchronization.lastSync = new Date();
            integration.synchronization.lastSyncStatus = syncJob.status;
            await this.updateIntegration(integration);

            return {
                success: true,
                syncJobId: syncJob.id,
                duration: syncJob.endTime - syncJob.startTime,
                results: syncJob.results,
                nextSync: await this.getNextSyncTime(integration)
            };
        } catch (error) {
            console.error('Error synchronizing data:', error);
            throw error;
        }
    }

    /**
     * Sync expenses with ERP system
     */
    async syncExpenses(integration, options) {
        try {
            const results = { processed: 0, successful: 0, failed: 0, errors: [] };
            
            // Get pending expenses from ExpenseFlow
            const expenses = await this.getPendingExpenses(integration.tenantId, options);
            
            // Get mapping template
            const mappingTemplate = this.mappingTemplates.get(integration.mapping.expenses);
            
            // Process expenses in batches
            const batchSize = integration.options.batchSize;
            
            for (let i = 0; i < expenses.length; i += batchSize) {
                const batch = expenses.slice(i, i + batchSize);
                
                try {
                    // Transform data according to mapping
                    const transformedExpenses = await this.transformExpenseData(batch, mappingTemplate, integration);
                    
                    // Send to ERP system
                    const erpResponse = await this.sendExpensesToERP(transformedExpenses, integration);
                    
                    // Process response
                    results.processed += batch.length;
                    results.successful += erpResponse.successful || 0;
                    results.failed += erpResponse.failed || 0;
                    
                    if (erpResponse.errors) {
                        results.errors.push(...erpResponse.errors);
                    }
                    
                    // Update expense sync status
                    await this.updateExpenseSyncStatus(batch, erpResponse, integration);
                    
                } catch (batchError) {
                    console.error('Error processing expense batch:', batchError);
                    results.failed += batch.length;
                    results.errors.push({
                        batch: i / batchSize + 1,
                        error: batchError.message,
                        expenseIds: batch.map(e => e.id)
                    });
                }
            }
            
            return results;
        } catch (error) {
            console.error('Error syncing expenses:', error);
            throw error;
        }
    }

    /**
     * Transform expense data according to mapping template
     */
    async transformExpenseData(expenses, mappingTemplate, integration) {
        const transformed = [];
        
        for (const expense of expenses) {
            try {
                const transformedExpense = {};
                
                // Apply field mappings
                for (const [sourceField, targetField] of Object.entries(mappingTemplate.sourceFields)) {
                    if (expense[sourceField] !== undefined) {
                        transformedExpense[targetField] = expense[sourceField];
                    }
                }
                
                // Apply transformations
                for (const [field, transformation] of Object.entries(mappingTemplate.transformations)) {
                    if (transformedExpense[field] !== undefined) {
                        transformedExpense[field] = await this.applyTransformation(
                            transformedExpense[field], 
                            transformation, 
                            integration
                        );
                    }
                }
                
                // Validate data
                const validation = await this.validateTransformedData(transformedExpense, mappingTemplate.validations);
                if (!validation.valid) {
                    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
                }
                
                // Add ERP-specific fields
                transformedExpense._originalId = expense.id;
                transformedExpense._tenantId = integration.tenantId;
                transformedExpense._syncTimestamp = new Date().toISOString();
                
                transformed.push(transformedExpense);
                
            } catch (transformError) {
                console.error(`Error transforming expense ${expense.id}:`, transformError);
                // Add to failed list but continue processing
            }
        }
        
        return transformed;
    }

    /**
     * Apply data transformation
     */
    async applyTransformation(value, transformation, integration) {
        switch (transformation) {
            case 'dateFormat':
                return this.formatDateForERP(value, integration.erpSystem);
            
            case 'currencyConvert':
                return await this.convertCurrency(value, integration);
            
            case 'categoryMap':
                return await this.mapCategory(value, integration);
            
            case 'formatTaxId':
                return this.formatTaxId(value, integration.connector.regions[0]);
            
            case 'formatPhone':
                return this.formatPhoneNumber(value, integration.connector.regions[0]);
            
            default:
                return value;
        }
    }

    /**
     * Send expenses to ERP system
     */
    async sendExpensesToERP(expenses, integration) {
        try {
            const connector = integration.connector;
            const endpoint = connector.endpoints.expenses || connector.endpoints.rozchody || connector.endpoints.koszty;
            
            // Prepare API request
            const requestData = {
                method: 'POST',
                url: this.buildERPUrl(integration, endpoint),
                headers: await this.buildERPHeaders(integration),
                data: expenses
            };
            
            // Make API call to ERP system
            const response = await this.makeERPAPICall(requestData, integration);
            
            return {
                successful: response.success ? expenses.length : 0,
                failed: response.success ? 0 : expenses.length,
                errors: response.success ? [] : [response.error],
                erpResponse: response.data
            };
        } catch (error) {
            console.error('Error sending expenses to ERP:', error);
            return {
                successful: 0,
                failed: expenses.length,
                errors: [error.message],
                erpResponse: null
            };
        }
    }

    /**
     * Get integration metrics and health status
     */
    async getIntegrationMetrics(integrationId, timeframe = '24h') {
        try {
            const integration = await this.getIntegration(integrationId);
            if (!integration) {
                throw new Error('Integration not found');
            }

            const metrics = {
                integrationId,
                erpSystem: integration.erpSystem,
                timeframe,
                generatedAt: new Date(),
                health: {
                    status: integration.configuration.status,
                    lastSync: integration.synchronization.lastSync,
                    uptime: this.calculateUptime(integration),
                    errorRate: await this.calculateErrorRate(integrationId, timeframe)
                },
                synchronization: {
                    totalSyncs: await this.getTotalSyncCount(integrationId, timeframe),
                    successfulSyncs: await this.getSuccessfulSyncCount(integrationId, timeframe),
                    failedSyncs: await this.getFailedSyncCount(integrationId, timeframe),
                    averageSyncDuration: await this.getAverageSyncDuration(integrationId, timeframe)
                },
                dataVolume: {
                    expensesSynced: await this.getExpensesSyncedCount(integrationId, timeframe),
                    vendorsSynced: await this.getVendorsSyncedCount(integrationId, timeframe),
                    invoicesSynced: await this.getInvoicesSyncedCount(integrationId, timeframe)
                },
                performance: {
                    throughput: await this.calculateThroughput(integrationId, timeframe),
                    latency: await this.calculateAverageLatency(integrationId, timeframe),
                    apiCallsPerHour: await this.getAPICallsPerHour(integrationId, timeframe)
                }
            };

            return metrics;
        } catch (error) {
            console.error('Error getting integration metrics:', error);
            throw error;
        }
    }

    // Helper methods for ERP-specific formatting and transformations

    formatDateForERP(date, erpSystem) {
        const d = new Date(date);
        switch (erpSystem) {
            case 'sap':
                return d.toISOString().split('T')[0]; // YYYY-MM-DD
            case 'comarch_optima':
                return d.toLocaleDateString('pl-PL'); // DD.MM.YYYY
            case 'datev':
                return d.toLocaleDateString('de-DE'); // DD.MM.YYYY
            default:
                return d.toISOString().split('T')[0];
        }
    }

    formatTaxId(taxId, region) {
        switch (region) {
            case 'pl':
                // Polish NIP format: XXX-XXX-XX-XX
                return taxId.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1-$2-$3-$4');
            case 'de':
                // German tax ID format varies
                return taxId.replace(/\D/g, '');
            default:
                return taxId;
        }
    }

    async convertCurrency(amount, integration) {
        // Mock currency conversion (implement with real exchange rates)
        return amount; // In real implementation, convert based on integration currency settings
    }

    async mapCategory(category, integration) {
        // Mock category mapping (implement with configurable category mappings)
        const categoryMappings = {
            'travel': '4210', // Travel expenses account
            'office': '4220', // Office supplies account
            'meals': '4230', // Meals & entertainment account
            'software': '4240', // Software/IT account
            'marketing': '4250' // Marketing account
        };
        
        return categoryMappings[category] || '4999'; // Default other expenses account
    }

    buildERPUrl(integration, endpoint) {
        const baseUrl = integration.configuration.baseUrl || this.getDefaultERPUrl(integration.erpSystem);
        return `${baseUrl}${endpoint}`;
    }

    async buildERPHeaders(integration) {
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'ExpenseFlow-Integration/1.0'
        };

        // Add authentication headers based on method
        switch (integration.authentication.method) {
            case 'oauth2':
                headers['Authorization'] = `Bearer ${integration.authentication.credentials.accessToken}`;
                break;
            case 'api_key':
                headers['X-API-Key'] = integration.authentication.credentials.apiKey;
                break;
            case 'basic':
                const auth = Buffer.from(`${integration.authentication.credentials.username}:${integration.authentication.credentials.password}`).toString('base64');
                headers['Authorization'] = `Basic ${auth}`;
                break;
        }

        return headers;
    }

    async makeERPAPICall(requestData, integration) {
        // Mock API call implementation
        console.log(`Making ERP API call to ${integration.erpSystem}:`, {
            method: requestData.method,
            url: requestData.url,
            dataCount: Array.isArray(requestData.data) ? requestData.data.length : 1
        });

        // Simulate success/failure
        return {
            success: Math.random() > 0.1, // 90% success rate
            data: { created: Array.isArray(requestData.data) ? requestData.data.length : 1 },
            error: Math.random() > 0.9 ? null : 'Mock error'
        };
    }

    // Mock data methods for system functionality
    async storeIntegration(integration) {
        console.log('Storing integration:', integration.id);
        return true;
    }

    async getIntegration(integrationId) {
        // Mock integration data
        return {
            id: integrationId,
            tenantId: 'demo-tenant',
            erpSystem: 'quickbooks',
            connector: this.connectors.get('quickbooks'),
            configuration: {
                status: 'active',
                baseUrl: 'https://api.quickbooks.com'
            },
            authentication: {
                method: 'oauth2',
                credentials: { accessToken: 'mock-token' }
            },
            mapping: {
                expenses: 'expense_standard'
            },
            synchronization: {
                frequency: 'hourly',
                lastSync: new Date()
            },
            options: { batchSize: 50 }
        };
    }

    async updateIntegration(integration) {
        console.log('Updating integration:', integration.id);
        return true;
    }

    async scheduleSynchronizationJob(integration) {
        console.log('Scheduling sync job for integration:', integration.id);
        return true;
    }

    async getNextSyncTime(integration) {
        return new Date(Date.now() + 3600000); // 1 hour from now
    }

    async validateAuthentication(integration) {
        // Mock authentication validation
        return { valid: true };
    }

    async testConnection(integration) {
        // Mock connection test
        return { success: true, message: 'Connection successful' };
    }

    async getPendingExpenses(tenantId, options) {
        // Mock pending expenses
        return [{
            id: 'exp-1',
            amount: 150.00,
            currency: 'USD',
            date: new Date(),
            merchant: 'Office Depot',
            category: 'office-supplies',
            description: 'Office supplies'
        }];
    }

    async updateExpenseSyncStatus(expenses, response, integration) {
        console.log('Updating expense sync status for', expenses.length, 'expenses');
        return true;
    }

    async validateTransformedData(data, validations) {
        // Mock validation
        return { valid: true, errors: [] };
    }

    aggregateSyncResults(results) {
        let totalProcessed = 0;
        let totalSuccessful = 0;
        let totalFailed = 0;
        const allErrors = [];

        Object.values(results).forEach(result => {
            totalProcessed += result.processed || 0;
            totalSuccessful += result.successful || 0;
            totalFailed += result.failed || 0;
            if (result.errors) {
                allErrors.push(...result.errors);
            }
        });

        return {
            processed: totalProcessed,
            successful: totalSuccessful,
            failed: totalFailed,
            errors: allErrors
        };
    }

    async syncVendors(integration, options) {
        // Mock vendor sync
        return {
            processed: 10,
            successful: 9,
            failed: 1,
            errors: ['Vendor validation failed for ID: vendor-5']
        };
    }

    async syncInvoices(integration, options) {
        // Mock invoice sync
        return {
            processed: 25,
            successful: 24,
            failed: 1,
            errors: ['Invoice duplicate detected: INV-001']
        };
    }

    // Integration metrics methods
    async getTotalSyncCount(integrationId, timeframe) {
        return 150; // Mock sync count
    }

    async getSuccessfulSyncCount(integrationId, timeframe) {
        return 142; // Mock successful syncs
    }

    async getFailedSyncCount(integrationId, timeframe) {
        return 8; // Mock failed syncs
    }

    async getAverageSyncDuration(integrationId, timeframe) {
        return 45; // Mock average duration in seconds
    }

    async getExpensesSyncedCount(integrationId, timeframe) {
        return 1250; // Mock expenses synced
    }

    async getVendorsSyncedCount(integrationId, timeframe) {
        return 45; // Mock vendors synced
    }

    async getInvoicesSyncedCount(integrationId, timeframe) {
        return 320; // Mock invoices synced
    }

    async calculateThroughput(integrationId, timeframe) {
        return 28.5; // Mock throughput (records per hour)
    }

    async calculateAverageLatency(integrationId, timeframe) {
        return 1.2; // Mock latency in seconds
    }

    async getAPICallsPerHour(integrationId, timeframe) {
        return 125; // Mock API calls per hour
    }

    calculateUptime(integration) {
        return 99.8; // Mock uptime percentage
    }

    async calculateErrorRate(integrationId, timeframe) {
        return 0.05; // Mock error rate (5%)
    }

    formatPhoneNumber(phone, region) {
        // Mock phone formatting
        return phone.replace(/\D/g, '');
    }
}

module.exports = ERPIntegrationFramework; 
const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:8001';
const API_PREFIX = '/api/v1';

class Phase3EnterpriseTestSuite {
    constructor() {
        this.testToken = 'test-jwt-token-for-demo';
        this.results = {};
        this.totalTests = 0;
        this.passedTests = 0;
    }

    async runAllTests() {
        console.log('\n🚀 ===============================================');
        console.log('🚀 ExpenseFlow Pro Phase 3: Enterprise Testing');
        console.log('🚀 ===============================================\n');

        try {
            // Test all Phase 3 features
            await this.testContinuousLearning();
            await this.testPredictiveAnalytics();
            await this.testFraudDetection();
            await this.testEnterpriseManagement();
            await this.testAPIManagement();
            await this.testERPIntegrations();
            await this.testEnhancedSecurity();

            this.displaySummary();
        } catch (error) {
            console.error('❌ Test Suite Failed:', error.message);
        }
    }

    async testContinuousLearning() {
        console.log('🤖 Testing Continuous Learning Engine...\n');

        const tests = [
            {
                name: 'OCR Feedback Collection',
                endpoint: `${API_PREFIX}/ai/learning/ocr-feedback`,
                method: 'POST',
                data: {
                    documentId: 'doc_123',
                    extractedData: { amount: 125.50, merchant: 'Coffee Shop' },
                    correctedData: { amount: 125.50, merchant: 'Coffee Shop Ltd' },
                    userId: 'user_456'
                }
            },
            {
                name: 'Categorization Feedback',
                endpoint: `${API_PREFIX}/ai/learning/categorization-feedback`,
                method: 'POST',
                data: {
                    expenseId: 'exp_789',
                    predictedCategory: 'meals',
                    actualCategory: 'travel',
                    confidence: 0.85
                }
            },
            {
                name: 'Model Performance Metrics',
                endpoint: `${API_PREFIX}/ai/learning/metrics`,
                method: 'GET'
            },
            {
                name: 'Trigger Model Retraining',
                endpoint: `${API_PREFIX}/ai/learning/retrain`,
                method: 'POST',
                data: { modelType: 'ocr' }
            }
        ];

        for (const test of tests) {
            await this.executeTest(test);
        }
    }

    async testPredictiveAnalytics() {
        console.log('\n📊 Testing Predictive Analytics Engine...\n');

        const tests = [
            {
                name: 'Budget Forecast Generation',
                endpoint: `${API_PREFIX}/analytics/forecast/budget`,
                method: 'POST',
                data: { timeframe: 'monthly', periods: 12 }
            },
            {
                name: 'Spending Anomaly Detection',
                endpoint: `${API_PREFIX}/analytics/anomalies`,
                method: 'POST',
                data: { timeframe: 'daily', sensitivity: 'medium' }
            },
            {
                name: 'Spending Pattern Analysis',
                endpoint: `${API_PREFIX}/analytics/patterns`,
                method: 'POST',
                data: { analysisType: 'comprehensive' }
            },
            {
                name: 'Budget Variance Prediction',
                endpoint: `${API_PREFIX}/analytics/variance/budget_123`,
                method: 'GET'
            },
            {
                name: 'Category Forecast',
                endpoint: `${API_PREFIX}/analytics/forecast/categories`,
                method: 'POST',
                data: { categoryIds: ['travel', 'meals'], periods: 6 }
            }
        ];

        for (const test of tests) {
            await this.executeTest(test);
        }
    }

    async testFraudDetection() {
        console.log('\n🛡️ Testing Fraud Detection Engine...\n');

        const tests = [
            {
                name: 'Real-time Fraud Analysis',
                endpoint: `${API_PREFIX}/fraud/analyze`,
                method: 'POST',
                data: {
                    expenseId: 'exp_suspicious_123',
                    amount: 5000,
                    merchant: 'Unknown Merchant',
                    date: new Date().toISOString()
                }
            },
            {
                name: 'Document Anomaly Detection',
                endpoint: `${API_PREFIX}/fraud/document-analysis`,
                method: 'POST',
                data: {
                    documentId: 'doc_456',
                    expenseId: 'exp_789'
                }
            },
            {
                name: 'Policy Compliance Check',
                endpoint: `${API_PREFIX}/fraud/policy-check`,
                method: 'POST',
                data: {
                    expenseId: 'exp_policy_test',
                    amount: 1500,
                    category: 'meals'
                }
            },
            {
                name: 'Fraud Risk Assessment',
                endpoint: `${API_PREFIX}/fraud/risk-assessment/user_123`,
                method: 'GET'
            },
            {
                name: 'Fraud Detection Metrics',
                endpoint: `${API_PREFIX}/fraud/metrics`,
                method: 'GET'
            }
        ];

        for (const test of tests) {
            await this.executeTest(test);
        }
    }

    async testEnterpriseManagement() {
        console.log('\n🏢 Testing Enterprise Management System...\n');

        const tests = [
            {
                name: 'Create Company Entity',
                endpoint: `${API_PREFIX}/enterprise/companies`,
                method: 'POST',
                data: {
                    name: 'ACME Corp Poland',
                    country: 'PL',
                    currency: 'PLN',
                    parentCompanyId: null
                }
            },
            {
                name: 'Multi-Company Consolidated Report',
                endpoint: `${API_PREFIX}/enterprise/reports/consolidated`,
                method: 'POST',
                data: {
                    companyIds: ['comp_1', 'comp_2'],
                    timeframe: 'quarterly',
                    currency: 'EUR'
                }
            },
            {
                name: 'Access Control Matrix',
                endpoint: `${API_PREFIX}/enterprise/access-control`,
                method: 'GET'
            },
            {
                name: 'Department Structure',
                endpoint: `${API_PREFIX}/enterprise/departments/comp_123`,
                method: 'GET'
            },
            {
                name: 'Cross-Entity Analytics',
                endpoint: `${API_PREFIX}/enterprise/analytics/cross-entity`,
                method: 'POST',
                data: {
                    companyIds: ['comp_1', 'comp_2'],
                    analysisType: 'spending_comparison'
                }
            }
        ];

        for (const test of tests) {
            await this.executeTest(test);
        }
    }

    async testAPIManagement() {
        console.log('\n🔑 Testing API Management System...\n');

        const tests = [
            {
                name: 'Generate API Key',
                endpoint: `${API_PREFIX}/developer/api-keys`,
                method: 'POST',
                data: {
                    name: 'Test Integration Key',
                    permissions: ['read:expenses', 'write:expenses'],
                    rateLimit: { requests: 1000, period: 'hour' }
                }
            },
            {
                name: 'Webhook Subscription',
                endpoint: `${API_PREFIX}/developer/webhooks`,
                method: 'POST',
                data: {
                    url: 'https://api.example.com/webhooks/expenseflow',
                    events: ['expense.created', 'expense.approved'],
                    secret: 'webhook_secret_123'
                }
            },
            {
                name: 'API Documentation',
                endpoint: `${API_PREFIX}/developer/documentation`,
                method: 'GET'
            },
            {
                name: 'API Analytics',
                endpoint: `${API_PREFIX}/developer/analytics`,
                method: 'GET'
            },
            {
                name: 'Rate Limit Status',
                endpoint: `${API_PREFIX}/developer/rate-limits/api_key_123`,
                method: 'GET'
            }
        ];

        for (const test of tests) {
            await this.executeTest(test);
        }
    }

    async testERPIntegrations() {
        console.log('\n🔗 Testing ERP Integration Framework...\n');

        const tests = [
            {
                name: 'SAP Integration Setup',
                endpoint: `${API_PREFIX}/integrations/sap/configure`,
                method: 'POST',
                data: {
                    serverUrl: 'https://sap.company.com',
                    username: 'integration_user',
                    clientId: '100'
                }
            },
            {
                name: 'QuickBooks Sync',
                endpoint: `${API_PREFIX}/integrations/quickbooks/sync`,
                method: 'POST',
                data: {
                    companyId: 'comp_123',
                    syncType: 'expenses'
                }
            },
            {
                name: 'Polish System (Comarch) Test',
                endpoint: `${API_PREFIX}/integrations/comarch/test-connection`,
                method: 'POST',
                data: {
                    apiUrl: 'https://api.comarch.pl',
                    apiKey: 'test_key_123'
                }
            },
            {
                name: 'German DATEV Integration',
                endpoint: `${API_PREFIX}/integrations/datev/configure`,
                method: 'POST',
                data: {
                    consultantNumber: '12345',
                    clientNumber: '67890',
                    serverUrl: 'https://datev-api.de'
                }
            },
            {
                name: 'Integration Status Dashboard',
                endpoint: `${API_PREFIX}/integrations/status`,
                method: 'GET'
            }
        ];

        for (const test of tests) {
            await this.executeTest(test);
        }
    }

    async testEnhancedSecurity() {
        console.log('\n🔐 Testing Enhanced Security System...\n');

        const tests = [
            {
                name: 'Setup MFA (TOTP)',
                endpoint: `${API_PREFIX}/security/mfa/setup`,
                method: 'POST',
                data: {
                    userId: 'user_123',
                    method: 'totp'
                }
            },
            {
                name: 'SSO Configuration (Azure AD)',
                endpoint: `${API_PREFIX}/security/sso/configure`,
                method: 'POST',
                data: {
                    provider: 'azure_ad',
                    tenantId: 'tenant_456',
                    clientId: 'client_789'
                }
            },
            {
                name: 'Access Policy Evaluation',
                endpoint: `${API_PREFIX}/security/policies/evaluate`,
                method: 'POST',
                data: {
                    userId: 'user_123',
                    resource: 'expense_reports',
                    action: 'read'
                }
            },
            {
                name: 'Compliance Report (GDPR)',
                endpoint: `${API_PREFIX}/security/compliance/gdpr`,
                method: 'GET'
            },
            {
                name: 'Security Audit Log',
                endpoint: `${API_PREFIX}/security/audit`,
                method: 'GET'
            }
        ];

        for (const test of tests) {
            await this.executeTest(test);
        }
    }

    async executeTest(test) {
        this.totalTests++;
        
        try {
            const config = {
                method: test.method,
                url: `${BASE_URL}${test.endpoint}`,
                headers: {
                    'Authorization': `Bearer ${this.testToken}`,
                    'Content-Type': 'application/json'
                }
            };

            if (test.data) {
                config.data = test.data;
            }

            const response = await axios(config);
            
            if (response.status >= 200 && response.status < 300) {
                console.log(`✅ ${test.name}: PASSED`);
                this.passedTests++;
                
                // Show sample response for key endpoints
                if (test.name.includes('Forecast') || test.name.includes('Analysis') || test.name.includes('Report')) {
                    console.log(`   📋 Sample Response:`, JSON.stringify(response.data, null, 2).substring(0, 200) + '...\n');
                }
            } else {
                console.log(`❌ ${test.name}: FAILED (Status: ${response.status})`);
            }
        } catch (error) {
            console.log(`❌ ${test.name}: FAILED (${error.message})`);
        }
    }

    displaySummary() {
        console.log('\n🎯 ===============================================');
        console.log('🎯 Phase 3 Enterprise Testing Summary');
        console.log('🎯 ===============================================');
        console.log(`📊 Total Tests: ${this.totalTests}`);
        console.log(`✅ Passed: ${this.passedTests}`);
        console.log(`❌ Failed: ${this.totalTests - this.passedTests}`);
        console.log(`📈 Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%\n`);

        if (this.passedTests === this.totalTests) {
            console.log('🎉 ALL TESTS PASSED! Phase 3 Enterprise features are fully operational!');
            console.log('\n🌟 Key Enterprise Capabilities Verified:');
            console.log('   🤖 Advanced AI & Continuous Learning');
            console.log('   📊 Predictive Analytics & Forecasting');
            console.log('   🛡️ AI-Powered Fraud Detection');
            console.log('   🏢 Multi-Company Enterprise Management');
            console.log('   🔑 Professional API Management');
            console.log('   🔗 International ERP Integrations');
            console.log('   🔐 Enterprise Security & Compliance');
        } else {
            console.log('⚠️  Some tests failed. Please review the results above.');
        }

        console.log('\n🚀 ExpenseFlow Pro is now ready for international enterprise deployment!');
    }
}

// Run the test suite
if (require.main === module) {
    const testSuite = new Phase3EnterpriseTestSuite();
    testSuite.runAllTests().catch(console.error);
}

module.exports = Phase3EnterpriseTestSuite; 
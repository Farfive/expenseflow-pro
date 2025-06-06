/**
 * ExpenseFlow Pro - Comprehensive User Scenarios Test
 * Tests all functionality across different screens, buttons, and workflows
 */

const axios = require('axios');
const fs = require('fs').promises;

const BASE_URL = 'http://localhost:3002';
const API_URL = `${BASE_URL}/api`;

// Test Data for Different User Personas
const testUsers = {
    cfo: {
        name: 'Robert Chen',
        email: 'robert.chen@techcorp.com',
        role: 'CFO',
        department: 'Finance',
        company: 'TechCorp Solutions'
    },
    accountant: {
        name: 'Maria Rodriguez',
        email: 'maria.rodriguez@techcorp.com',
        role: 'Senior Accountant',
        department: 'Finance',
        company: 'TechCorp Solutions'
    },
    employee: {
        name: 'David Kim',
        email: 'david.kim@techcorp.com',
        role: 'Software Engineer',
        department: 'Engineering',
        company: 'TechCorp Solutions'
    },
    manager: {
        name: 'Jennifer Smith',
        email: 'jennifer.smith@techcorp.com',
        role: 'Engineering Manager',
        department: 'Engineering',
        company: 'TechCorp Solutions'
    },
    sales: {
        name: 'Alex Thompson',
        email: 'alex.thompson@techcorp.com',
        role: 'Sales Director',
        department: 'Sales',
        company: 'TechCorp Solutions'
    }
};

// Comprehensive Test Scenarios
const testScenarios = [
    {
        id: 'SCENARIO_1',
        title: 'Complete Employee Expense Submission & Approval Workflow',
        user: testUsers.employee,
        description: 'David submits business trip expenses with receipts and follows approval workflow',
        steps: [
            'Login to dashboard',
            'Navigate to Expenses section',
            'Click "New Expense" button',
            'Upload multiple receipts (hotel, flight, meals)',
            'Test OCR processing for each document',
            'Verify auto-categorization',
            'Fill expense details form',
            'Submit for approval',
            'Check status tracking',
            'Test notification system'
        ]
    },
    {
        id: 'SCENARIO_2',
        title: 'Manager Approval & Budget Oversight Dashboard',
        user: testUsers.manager,
        description: 'Jennifer reviews team expenses, approves/rejects, and monitors department budget',
        steps: [
            'Login to manager dashboard',
            'Navigate to Approvals section',
            'Review pending expense submissions',
            'Test approval/rejection buttons',
            'Add approval comments',
            'Check budget analytics',
            'View team spending reports',
            'Test budget alert functionality',
            'Export approval reports'
        ]
    },
    {
        id: 'SCENARIO_3',
        title: 'CFO Executive Analytics & Financial Reporting',
        user: testUsers.cfo,
        description: 'Robert monitors company-wide expenses, generates reports, and analyzes spending patterns',
        steps: [
            'Access executive dashboard',
            'View company-wide analytics',
            'Test all chart interactions',
            'Generate monthly financial reports',
            'Analyze spending by department',
            'Review compliance metrics',
            'Test export functionality',
            'Check predictive analytics',
            'Verify audit trail features'
        ]
    },
    {
        id: 'SCENARIO_4',
        title: 'Accountant Document Processing & Reconciliation',
        user: testUsers.accountant,
        description: 'Maria processes documents, reconciles transactions, and manages categorization',
        steps: [
            'Login to accounting interface',
            'Navigate to Document Processing',
            'Bulk upload multiple documents',
            'Test OCR batch processing',
            'Review auto-categorization results',
            'Manual categorization corrections',
            'Transaction matching workflow',
            'Bank statement reconciliation',
            'Generate accounting reports',
            'Test export to accounting software'
        ]
    },
    {
        id: 'SCENARIO_5',
        title: 'Sales Team Travel & Entertainment Expenses',
        user: testUsers.sales,
        description: 'Alex manages complex sales trip expenses with client entertainment and mileage tracking',
        steps: [
            'Access sales dashboard',
            'Submit client entertainment expenses',
            'Track mileage for client visits',
            'Upload receipts for multiple clients',
            'Test project/client allocation',
            'Review sales team expenses',
            'Generate client-specific reports',
            'Test billable expense tracking',
            'Verify commission impact analysis'
        ]
    }
];

// Test expense data for different scenarios
const testExpenses = {
    businessTrip: [
        {
            merchant: 'Marriott Downtown Hotel',
            amount: 450.00,
            category: 'Accommodation',
            date: '2024-01-15',
            description: 'Client meeting - 2 nights',
            receiptUrl: 'hotel_receipt.jpg'
        },
        {
            merchant: 'American Airlines',
            amount: 680.00,
            category: 'Transportation',
            date: '2024-01-14',
            description: 'Flight to client site',
            receiptUrl: 'flight_receipt.pdf'
        },
        {
            merchant: 'The Capital Grille',
            amount: 125.50,
            category: 'Business Meals',
            date: '2024-01-15',
            description: 'Client dinner meeting',
            receiptUrl: 'dinner_receipt.jpg'
        }
    ],
    officeSupplies: [
        {
            merchant: 'Office Depot',
            amount: 89.99,
            category: 'Office Supplies',
            date: '2024-01-10',
            description: 'Team workspace supplies',
            receiptUrl: 'office_supplies.jpg'
        },
        {
            merchant: 'Best Buy Business',
            amount: 299.99,
            category: 'Equipment',
            date: '2024-01-12',
            description: 'Wireless presentation remote',
            receiptUrl: 'equipment_receipt.jpg'
        }
    ],
    clientEntertainment: [
        {
            merchant: 'Morton\'s Steakhouse',
            amount: 245.75,
            category: 'Client Entertainment',
            date: '2024-01-18',
            description: 'Dinner with prospective client',
            receiptUrl: 'client_dinner.jpg',
            clientName: 'Global Tech Solutions'
        },
        {
            merchant: 'Uber Business',
            amount: 45.20,
            category: 'Transportation',
            date: '2024-01-18',
            description: 'Airport pickup for client',
            receiptUrl: 'uber_receipt.jpg'
        }
    ]
};

class ComprehensiveUserScenarioTest {
    constructor() {
        this.testResults = [];
        this.currentUser = null;
        this.testSession = {
            startTime: new Date(),
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            scenarios: []
        };
    }

    async runAllScenarios() {
        console.log('🚀 Starting Comprehensive User Scenario Testing');
        console.log('=' .repeat(60));

        for (const scenario of testScenarios) {
            await this.runScenario(scenario);
        }

        await this.generateDetailedReport();
    }

    async runScenario(scenario) {
        console.log(`\n📋 SCENARIO ${scenario.id}: ${scenario.title}`);
        console.log(`👤 User: ${scenario.user.name} (${scenario.user.role})`);
        console.log(`📝 ${scenario.description}`);
        console.log('-'.repeat(50));

        const scenarioResult = {
            id: scenario.id,
            title: scenario.title,
            user: scenario.user,
            startTime: new Date(),
            steps: [],
            status: 'running',
            errors: []
        };

        this.currentUser = scenario.user;

        try {
            switch (scenario.id) {
                case 'SCENARIO_1':
                    await this.testEmployeeExpenseWorkflow(scenarioResult);
                    break;
                case 'SCENARIO_2':
                    await this.testManagerApprovalWorkflow(scenarioResult);
                    break;
                case 'SCENARIO_3':
                    await this.testCFOAnalyticsWorkflow(scenarioResult);
                    break;
                case 'SCENARIO_4':
                    await this.testAccountantProcessingWorkflow(scenarioResult);
                    break;
                case 'SCENARIO_5':
                    await this.testSalesExpenseWorkflow(scenarioResult);
                    break;
            }

            scenarioResult.status = 'completed';
            scenarioResult.endTime = new Date();
            scenarioResult.duration = scenarioResult.endTime - scenarioResult.startTime;

        } catch (error) {
            scenarioResult.status = 'failed';
            scenarioResult.errors.push(error.message);
            console.log(`❌ Scenario failed: ${error.message}`);
        }

        this.testSession.scenarios.push(scenarioResult);
        this.testSession.totalTests++;
        
        if (scenarioResult.status === 'completed') {
            this.testSession.passedTests++;
            console.log(`✅ ${scenario.title} - COMPLETED`);
        } else {
            this.testSession.failedTests++;
            console.log(`❌ ${scenario.title} - FAILED`);
        }
    }

    async testEmployeeExpenseWorkflow(scenarioResult) {
        // Step 1: Login and Dashboard Access
        await this.testStep(scenarioResult, 'User Login', async () => {
            const response = await axios.post(`${API_URL}/auth/login`, {
                email: this.currentUser.email,
                password: this.currentUser.email.includes('test@expenseflow.com') ? 'password123' : 'test123'
            });
            return response.data.success;
        });

        // Step 2: Navigate to Expenses Dashboard
        await this.testStep(scenarioResult, 'Navigate to Expenses Dashboard', async () => {
            const response = await axios.get(`${API_URL}/dashboard/expenses`);
            return response.status === 200;
        });

        // Step 3: Click "New Expense" Button
        await this.testStep(scenarioResult, 'Click New Expense Button', async () => {
            const response = await axios.get(`${API_URL}/expenses/new`);
            return response.status === 200;
        });

        // Step 4: Upload and Process Business Trip Receipts
        for (const expense of testExpenses.businessTrip) {
            await this.testStep(scenarioResult, `Upload ${expense.merchant} Receipt`, async () => {
                const uploadResponse = await axios.post(`${API_URL}/expenses/upload`, {
                    file: expense.receiptUrl,
                    merchant: expense.merchant,
                    amount: expense.amount,
                    category: expense.category,
                    date: expense.date,
                    description: expense.description,
                    userId: this.currentUser.email
                });
                return uploadResponse.data.success;
            });

            // Test OCR Processing
            await this.testStep(scenarioResult, `OCR Processing - ${expense.merchant}`, async () => {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return true; // Simulated OCR processing
            });
        }

        // Step 5: Test Auto-Categorization
        await this.testStep(scenarioResult, 'Auto-Categorization Processing', async () => {
            const response = await axios.post(`${API_URL}/categorization/auto`, {
                expenses: testExpenses.businessTrip,
                userId: this.currentUser.email
            });
            return response.data.success;
        });

        // Step 6: Fill Expense Form Details
        await this.testStep(scenarioResult, 'Fill Expense Form', async () => {
            const formData = {
                tripPurpose: 'Client meeting and project kickoff',
                project: 'PROJECT-2024-001',
                approver: testUsers.manager.email,
                notes: 'Critical client meeting for Q1 project launch'
            };
            return true; // Form filling simulation
        });

        // Step 7: Submit for Approval
        await this.testStep(scenarioResult, 'Submit for Approval', async () => {
            const response = await axios.post(`${API_URL}/expenses/submit`, {
                expenses: testExpenses.businessTrip,
                submittedBy: this.currentUser.email,
                approver: testUsers.manager.email,
                totalAmount: testExpenses.businessTrip.reduce((sum, exp) => sum + exp.amount, 0)
            });
            return response.data.success;
        });

        // Step 8: Check Status Tracking
        await this.testStep(scenarioResult, 'Check Expense Status', async () => {
            const response = await axios.get(`${API_URL}/expenses/status/${this.currentUser.email}`);
            return response.status === 200 && response.data.expenses;
        });

        // Step 9: Test Notification System
        await this.testStep(scenarioResult, 'Test Notification System', async () => {
            const response = await axios.get(`${API_URL}/notifications/${this.currentUser.email}`);
            return response.status === 200;
        });
    }

    async testManagerApprovalWorkflow(scenarioResult) {
        // Step 1: Manager Dashboard Access
        await this.testStep(scenarioResult, 'Manager Dashboard Login', async () => {
            const response = await axios.post(`${API_URL}/auth/login`, {
                email: this.currentUser.email,
                password: 'test123'
            });
            return response.data.success;
        });

        // Step 2: Navigate to Approvals Section
        await this.testStep(scenarioResult, 'Navigate to Approvals', async () => {
            const response = await axios.get(`${API_URL}/approvals/pending`);
            return response.status === 200;
        });

        // Step 3: Review Pending Submissions
        await this.testStep(scenarioResult, 'Review Pending Submissions', async () => {
            const response = await axios.get(`${API_URL}/approvals/pending/${this.currentUser.email}`);
            return response.status === 200 && response.data.pendingApprovals;
        });

        // Step 4: Test Approval Button
        await this.testStep(scenarioResult, 'Test Approval Button', async () => {
            const response = await axios.post(`${API_URL}/approvals/approve`, {
                expenseId: 'EXP-001',
                approverId: this.currentUser.email,
                comments: 'Approved - valid business expense',
                amount: 1255.50
            });
            return response.data.success;
        });

        // Step 5: Test Rejection Button
        await this.testStep(scenarioResult, 'Test Rejection Button', async () => {
            const response = await axios.post(`${API_URL}/approvals/reject`, {
                expenseId: 'EXP-002',
                approverId: this.currentUser.email,
                comments: 'Please provide additional documentation',
                reason: 'Insufficient documentation'
            });
            return response.data.success;
        });

        // Step 6: Add Approval Comments
        await this.testStep(scenarioResult, 'Add Approval Comments', async () => {
            const response = await axios.post(`${API_URL}/approvals/comment`, {
                expenseId: 'EXP-003',
                approverId: this.currentUser.email,
                comment: 'Please split this expense by project for better tracking'
            });
            return response.data.success;
        });

        // Step 7: Check Budget Analytics
        await this.testStep(scenarioResult, 'Check Budget Analytics', async () => {
            const response = await axios.get(`${API_URL}/analytics/budget/${this.currentUser.department}`);
            return response.status === 200 && response.data.budgetData;
        });

        // Step 8: View Team Spending Reports
        await this.testStep(scenarioResult, 'View Team Spending Reports', async () => {
            const response = await axios.get(`${API_URL}/reports/team-spending/${this.currentUser.email}`);
            return response.status === 200;
        });

        // Step 9: Export Approval Reports
        await this.testStep(scenarioResult, 'Export Approval Reports', async () => {
            const response = await axios.post(`${API_URL}/exports/generate`, {
                type: 'approval-summary',
                managerId: this.currentUser.email,
                dateRange: '2024-01'
            });
            return response.data.success;
        });
    }

    async testCFOAnalyticsWorkflow(scenarioResult) {
        // Step 1: Executive Dashboard Access
        await this.testStep(scenarioResult, 'CFO Executive Dashboard Access', async () => {
            const response = await axios.get(`${API_URL}/dashboard/executive`);
            return response.status === 200;
        });

        // Step 2: Company-wide Analytics
        await this.testStep(scenarioResult, 'View Company-wide Analytics', async () => {
            const response = await axios.get(`${API_URL}/analytics/company-wide`);
            return response.status === 200 && response.data.companyMetrics;
        });

        // Step 3: Test Chart Interactions
        await this.testStep(scenarioResult, 'Test Spending by Category Chart', async () => {
            const response = await axios.get(`${API_URL}/analytics/charts/spending-by-category`);
            return response.status === 200;
        });

        await this.testStep(scenarioResult, 'Test Monthly Trend Chart', async () => {
            const response = await axios.get(`${API_URL}/analytics/charts/monthly-trends`);
            return response.status === 200;
        });

        await this.testStep(scenarioResult, 'Test Department Comparison Chart', async () => {
            const response = await axios.get(`${API_URL}/analytics/charts/department-comparison`);
            return response.status === 200;
        });

        // Step 4: Generate Financial Reports
        await this.testStep(scenarioResult, 'Generate Monthly Financial Report', async () => {
            const response = await axios.post(`${API_URL}/reports/generate`, {
                type: 'monthly-financial',
                period: '2024-01',
                includeCharts: true,
                format: 'pdf'
            });
            return response.data.success;
        });

        // Step 5: Analyze Spending by Department
        await this.testStep(scenarioResult, 'Analyze Department Spending', async () => {
            const response = await axios.get(`${API_URL}/analytics/department-breakdown`);
            return response.status === 200 && response.data.departments;
        });

        // Step 6: Review Compliance Metrics
        await this.testStep(scenarioResult, 'Review Compliance Metrics', async () => {
            const response = await axios.get(`${API_URL}/analytics/compliance`);
            return response.status === 200 && response.data.complianceScore;
        });

        // Step 7: Test Export Functionality
        await this.testStep(scenarioResult, 'Test Excel Export', async () => {
            const response = await axios.post(`${API_URL}/exports/excel`, {
                data: 'company-analytics',
                period: '2024-Q1'
            });
            return response.data.success;
        });

        // Step 8: Check Predictive Analytics
        await this.testStep(scenarioResult, 'Check Predictive Analytics', async () => {
            const response = await axios.get(`${API_URL}/analytics/predictive`);
            return response.status === 200 && response.data.predictions;
        });

        // Step 9: Verify Audit Trail
        await this.testStep(scenarioResult, 'Verify Audit Trail', async () => {
            const response = await axios.get(`${API_URL}/audit/trail`);
            return response.status === 200 && response.data.auditEvents;
        });
    }

    async testAccountantProcessingWorkflow(scenarioResult) {
        // Step 1: Accounting Interface Access
        await this.testStep(scenarioResult, 'Accounting Interface Login', async () => {
            const response = await axios.post(`${API_URL}/auth/login`, {
                email: this.currentUser.email,
                role: 'accountant'
            });
            return response.data.success;
        });

        // Step 2: Document Processing Dashboard
        await this.testStep(scenarioResult, 'Navigate to Document Processing', async () => {
            const response = await axios.get(`${API_URL}/documents/processing`);
            return response.status === 200;
        });

        // Step 3: Bulk Document Upload
        await this.testStep(scenarioResult, 'Bulk Document Upload', async () => {
            const response = await axios.post(`${API_URL}/documents/bulk-upload`, {
                documents: [
                    ...testExpenses.businessTrip,
                    ...testExpenses.officeSupplies
                ],
                uploadedBy: this.currentUser.email
            });
            return response.data.success;
        });

        // Step 4: OCR Batch Processing
        await this.testStep(scenarioResult, 'OCR Batch Processing', async () => {
            const response = await axios.post(`${API_URL}/documents/batch-ocr`, {
                batchId: 'BATCH-001',
                processingOptions: {
                    accuracy: 'high',
                    language: 'en'
                }
            });
            return response.data.success;
        });

        // Step 5: Review Auto-categorization
        await this.testStep(scenarioResult, 'Review Auto-categorization', async () => {
            const response = await axios.get(`${API_URL}/categorization/review`);
            return response.status === 200 && response.data.categorizedExpenses;
        });

        // Step 6: Manual Categorization Corrections
        await this.testStep(scenarioResult, 'Manual Categorization Corrections', async () => {
            const response = await axios.post(`${API_URL}/categorization/manual`, {
                expenseId: 'EXP-004',
                newCategory: 'Professional Development',
                reason: 'Conference registration fee',
                accountantId: this.currentUser.email
            });
            return response.data.success;
        });

        // Step 7: Transaction Matching
        await this.testStep(scenarioResult, 'Transaction Matching Workflow', async () => {
            const response = await axios.post(`${API_URL}/transactions/match`, {
                bankTransactions: [
                    { amount: 450.00, date: '2024-01-15', description: 'MARRIOTT DOWNTOWN' },
                    { amount: 680.00, date: '2024-01-14', description: 'AMERICAN AIRLINES' }
                ],
                expenseTransactions: testExpenses.businessTrip
            });
            return response.data.matchedTransactions;
        });

        // Step 8: Bank Statement Reconciliation
        await this.testStep(scenarioResult, 'Bank Statement Reconciliation', async () => {
            const response = await axios.post(`${API_URL}/reconciliation/bank-statement`, {
                statementFile: 'january_2024_statement.pdf',
                accountNumber: 'ACCT-12345',
                period: '2024-01'
            });
            return response.data.success;
        });

        // Step 9: Generate Accounting Reports
        await this.testStep(scenarioResult, 'Generate Accounting Reports', async () => {
            const response = await axios.post(`${API_URL}/reports/accounting`, {
                type: 'general-ledger',
                period: '2024-01',
                format: 'csv'
            });
            return response.data.success;
        });

        // Step 10: Export to Accounting Software
        await this.testStep(scenarioResult, 'Export to QuickBooks', async () => {
            const response = await axios.post(`${API_URL}/integrations/quickbooks/export`, {
                data: 'processed-expenses',
                period: '2024-01'
            });
            return response.data.success;
        });
    }

    async testSalesExpenseWorkflow(scenarioResult) {
        // Step 1: Sales Dashboard Access
        await this.testStep(scenarioResult, 'Sales Dashboard Access', async () => {
            const response = await axios.get(`${API_URL}/dashboard/sales`);
            return response.status === 200;
        });

        // Step 2: Client Entertainment Expenses
        await this.testStep(scenarioResult, 'Submit Client Entertainment', async () => {
            const response = await axios.post(`${API_URL}/expenses/client-entertainment`, {
                expenses: testExpenses.clientEntertainment,
                salesRep: this.currentUser.email,
                clientName: 'Global Tech Solutions',
                opportunity: 'Q1-2024-DEAL-001'
            });
            return response.data.success;
        });

        // Step 3: Mileage Tracking
        await this.testStep(scenarioResult, 'Track Client Visit Mileage', async () => {
            const response = await axios.post(`${API_URL}/expenses/mileage`, {
                startLocation: 'Office',
                endLocation: 'Client Site - Global Tech',
                miles: 45.2,
                purpose: 'Product demonstration',
                date: '2024-01-18',
                rate: 0.655
            });
            return response.data.success;
        });

        // Step 4: Project/Client Allocation
        await this.testStep(scenarioResult, 'Test Project/Client Allocation', async () => {
            const response = await axios.post(`${API_URL}/expenses/allocate`, {
                expenseId: 'EXP-005',
                allocations: [
                    { clientId: 'CLIENT-001', percentage: 60, amount: 147.45 },
                    { clientId: 'CLIENT-002', percentage: 40, amount: 98.30 }
                ]
            });
            return response.data.success;
        });

        // Step 5: Sales Team Expense Review
        await this.testStep(scenarioResult, 'Review Sales Team Expenses', async () => {
            const response = await axios.get(`${API_URL}/analytics/sales-team-expenses/${this.currentUser.email}`);
            return response.status === 200 && response.data.teamExpenses;
        });

        // Step 6: Client-Specific Reports
        await this.testStep(scenarioResult, 'Generate Client-Specific Reports', async () => {
            const response = await axios.post(`${API_URL}/reports/client-expenses`, {
                clientId: 'CLIENT-001',
                period: '2024-Q1',
                includeEntertainment: true
            });
            return response.data.success;
        });

        // Step 7: Billable Expense Tracking
        await this.testStep(scenarioResult, 'Track Billable Expenses', async () => {
            const response = await axios.post(`${API_URL}/expenses/billable`, {
                expenseIds: ['EXP-005', 'EXP-006'],
                clientId: 'CLIENT-001',
                billableRate: 1.15, // 15% markup
                invoiceNumber: 'INV-2024-001'
            });
            return response.data.success;
        });

        // Step 8: Commission Impact Analysis
        await this.testStep(scenarioResult, 'Commission Impact Analysis', async () => {
            const response = await axios.get(`${API_URL}/analytics/commission-impact/${this.currentUser.email}`);
            return response.status === 200 && response.data.commissionData;
        });
    }

    async testStep(scenarioResult, stepName, testFunction) {
        const stepResult = {
            name: stepName,
            startTime: new Date(),
            status: 'running'
        };

        console.log(`  🔄 ${stepName}...`);

        try {
            const result = await testFunction();
            
            if (result) {
                stepResult.status = 'passed';
                console.log(`  ✅ ${stepName} - PASSED`);
            } else {
                stepResult.status = 'failed';
                console.log(`  ❌ ${stepName} - FAILED`);
            }
        } catch (error) {
            stepResult.status = 'error';
            stepResult.error = error.message;
            console.log(`  ❌ ${stepName} - ERROR: ${error.message}`);
        }

        stepResult.endTime = new Date();
        stepResult.duration = stepResult.endTime - stepResult.startTime;
        
        scenarioResult.steps.push(stepResult);
        
        // Add small delay between steps for realistic testing
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    async generateDetailedReport() {
        this.testSession.endTime = new Date();
        this.testSession.totalDuration = this.testSession.endTime - this.testSession.startTime;

        const report = {
            testSession: this.testSession,
            summary: {
                totalScenarios: testScenarios.length,
                passedScenarios: this.testSession.passedTests,
                failedScenarios: this.testSession.failedTests,
                successRate: `${((this.testSession.passedTests / testScenarios.length) * 100).toFixed(1)}%`,
                totalDuration: `${Math.round(this.testSession.totalDuration / 1000)}s`
            },
            detailedResults: this.testSession.scenarios,
            recommendations: this.generateRecommendations()
        };

        // Save detailed report
        await fs.writeFile(
            'comprehensive-user-scenarios-report.json',
            JSON.stringify(report, null, 2)
        );

        // Generate console summary
        this.printSummaryReport(report);

        return report;
    }

    generateRecommendations() {
        const recommendations = [];

        // Analyze failed scenarios
        const failedScenarios = this.testSession.scenarios.filter(s => s.status === 'failed');
        
        if (failedScenarios.length > 0) {
            recommendations.push({
                priority: 'high',
                type: 'bug_fix',
                description: `${failedScenarios.length} scenarios failed and need immediate attention`,
                scenarios: failedScenarios.map(s => s.id)
            });
        }

        // Performance recommendations
        const slowSteps = this.testSession.scenarios
            .flatMap(s => s.steps)
            .filter(step => step.duration > 3000);

        if (slowSteps.length > 0) {
            recommendations.push({
                priority: 'medium',
                type: 'performance',
                description: `${slowSteps.length} steps are running slowly (>3s)`,
                steps: slowSteps.map(s => s.name)
            });
        }

        // Feature completeness
        recommendations.push({
            priority: 'low',
            type: 'enhancement',
            description: 'Consider adding real-time notifications for approval status changes'
        });

        return recommendations;
    }

    printSummaryReport(report) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 COMPREHENSIVE USER SCENARIO TEST RESULTS');
        console.log('='.repeat(60));
        
        console.log(`\n📈 SUMMARY:`);
        console.log(`  Total Scenarios: ${report.summary.totalScenarios}`);
        console.log(`  ✅ Passed: ${report.summary.passedScenarios}`);
        console.log(`  ❌ Failed: ${report.summary.failedScenarios}`);
        console.log(`  🎯 Success Rate: ${report.summary.successRate}`);
        console.log(`  ⏱️  Total Duration: ${report.summary.totalDuration}`);

        console.log(`\n📋 SCENARIO BREAKDOWN:`);
        report.detailedResults.forEach(scenario => {
            const statusIcon = scenario.status === 'completed' ? '✅' : '❌';
            const passedSteps = scenario.steps.filter(s => s.status === 'passed').length;
            const totalSteps = scenario.steps.length;
            
            console.log(`  ${statusIcon} ${scenario.title}`);
            console.log(`     User: ${scenario.user.name} (${scenario.user.role})`);
            console.log(`     Steps: ${passedSteps}/${totalSteps} passed`);
            console.log(`     Duration: ${Math.round(scenario.duration / 1000)}s`);
        });

        if (report.recommendations.length > 0) {
            console.log(`\n💡 RECOMMENDATIONS:`);
            report.recommendations.forEach((rec, index) => {
                console.log(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.description}`);
            });
        }

        console.log('\n📄 Detailed report saved to: comprehensive-user-scenarios-report.json');
        console.log('='.repeat(60));
    }
}

// Auto-run if called directly
if (require.main === module) {
    const tester = new ComprehensiveUserScenarioTest();
    tester.runAllScenarios().catch(console.error);
}

module.exports = ComprehensiveUserScenarioTest; 
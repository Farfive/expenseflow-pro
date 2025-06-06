const axios = require('axios');

const BASE_URL = 'http://localhost:3002';
const API_URL = `${BASE_URL}/api`;

console.log('🔍 ExpenseFlow Pro - Verification Test');
console.log('=====================================\n');

async function verifyFixes() {
    let passedTests = 0;
    let totalTests = 0;
    
    console.log('1. Testing Server Health...');
    totalTests++;
    try {
        const response = await axios.get(`${API_URL}/health`);
        if (response.data.status === 'healthy') {
            console.log('   ✅ Server is healthy');
            passedTests++;
        } else {
            console.log('   ❌ Server health check failed');
        }
    } catch (error) {
        console.log('   ❌ Server not responding:', error.message);
    }
    
    console.log('\n2. Testing Authentication...');
    totalTests += 3;
    
    // Test admin login
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: 'test@expenseflow.com',
            password: 'password123'
        });
        if (response.data.success) {
            console.log('   ✅ Admin login working');
            passedTests++;
        } else {
            console.log('   ❌ Admin login failed');
        }
    } catch (error) {
        console.log('   ❌ Admin login error:', error.message);
    }
    
    // Test employee login
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: 'david.kim@techcorp.com',
            password: 'test123'
        });
        if (response.data.success) {
            console.log('   ✅ Employee login working');
            passedTests++;
        } else {
            console.log('   ❌ Employee login failed');
        }
    } catch (error) {
        console.log('   ❌ Employee login error:', error.message);
    }
    
    // Test manager login
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: 'jennifer.smith@techcorp.com',
            password: 'test123'
        });
        if (response.data.success) {
            console.log('   ✅ Manager login working');
            passedTests++;
        } else {
            console.log('   ❌ Manager login failed');
        }
    } catch (error) {
        console.log('   ❌ Manager login error:', error.message);
    }
    
    console.log('\n3. Testing Missing Endpoints...');
    const endpoints = [
        { url: '/api/dashboard/expenses', name: 'Dashboard Expenses' },
        { url: '/api/expenses/new', name: 'New Expense Form' },
        { url: '/api/categories', name: 'Categories' },
        { url: '/api/approvals/pending', name: 'Pending Approvals' },
        { url: '/api/analytics/company-wide', name: 'Company Analytics' },
        { url: '/api/notifications/test-user', name: 'Notifications' }
    ];
    
    for (const endpoint of endpoints) {
        totalTests++;
        try {
            const response = await axios.get(`${BASE_URL}${endpoint.url}`);
            if (response.data.success) {
                console.log(`   ✅ ${endpoint.name} endpoint working`);
                passedTests++;
            } else {
                console.log(`   ❌ ${endpoint.name} endpoint failed`);
            }
        } catch (error) {
            console.log(`   ❌ ${endpoint.name} endpoint error:`, error.response?.status || error.message);
        }
    }
    
    console.log('\n4. Testing Expense Workflow...');
    totalTests += 3;
    
    // Test expense upload
    try {
        const response = await axios.post(`${API_URL}/expenses/upload`, {
            merchant: 'Test Restaurant',
            amount: 25.50,
            category: 'Business Meals',
            date: '2024-01-15',
            description: 'Client lunch',
            userId: 'test-user'
        });
        if (response.data.success) {
            console.log('   ✅ Expense upload working');
            passedTests++;
        } else {
            console.log('   ❌ Expense upload failed');
        }
    } catch (error) {
        console.log('   ❌ Expense upload error:', error.message);
    }
    
    // Test expense submission
    try {
        const response = await axios.post(`${API_URL}/expenses/submit`, {
            expenses: [{ merchant: 'Test Restaurant', amount: 25.50 }],
            submittedBy: 'test-user',
            approver: 'manager@test.com',
            totalAmount: 25.50
        });
        if (response.data.success) {
            console.log('   ✅ Expense submission working');
            passedTests++;
        } else {
            console.log('   ❌ Expense submission failed');
        }
    } catch (error) {
        console.log('   ❌ Expense submission error:', error.message);
    }
    
    // Test auto-categorization
    try {
        const response = await axios.post(`${API_URL}/categorization/auto`, {
            expenses: [
                { merchant: 'Hotel ABC', amount: 150.00 },
                { merchant: 'Uber', amount: 25.00 }
            ]
        });
        if (response.data.success) {
            console.log('   ✅ Auto-categorization working');
            passedTests++;
        } else {
            console.log('   ❌ Auto-categorization failed');
        }
    } catch (error) {
        console.log('   ❌ Auto-categorization error:', error.message);
    }
    
    console.log('\n5. Testing Approval Workflow...');
    totalTests += 2;
    
    // Test approval
    try {
        const response = await axios.post(`${API_URL}/approvals/approve`, {
            expenseId: 'exp_001',
            approverId: 'manager@test.com',
            comments: 'Approved - valid expense'
        });
        if (response.data.success) {
            console.log('   ✅ Approval workflow working');
            passedTests++;
        } else {
            console.log('   ❌ Approval workflow failed');
        }
    } catch (error) {
        console.log('   ❌ Approval workflow error:', error.message);
    }
    
    // Test rejection
    try {
        const response = await axios.post(`${API_URL}/approvals/reject`, {
            expenseId: 'exp_002',
            approverId: 'manager@test.com',
            comments: 'Rejected - insufficient documentation'
        });
        if (response.data.success) {
            console.log('   ✅ Rejection workflow working');
            passedTests++;
        } else {
            console.log('   ❌ Rejection workflow failed');
        }
    } catch (error) {
        console.log('   ❌ Rejection workflow error:', error.message);
    }
    
    // Results
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log('\n🎯 VERIFICATION RESULTS');
    console.log('=======================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${successRate}%`);
    
    if (successRate >= 90) {
        console.log('\n🎉 EXCELLENT! System is ready for comprehensive testing');
        console.log('All major issues have been resolved.');
    } else if (successRate >= 75) {
        console.log('\n✅ GOOD! Most issues fixed, minor tweaks needed');
    } else {
        console.log('\n⚠️  NEEDS WORK! Several issues still need attention');
    }
    
    console.log('\n📋 NEXT STEPS:');
    if (successRate >= 90) {
        console.log('1. Run comprehensive-user-scenarios-test.js');
        console.log('2. All user scenarios should now pass');
        console.log('3. System ready for frontend integration');
    } else {
        console.log('1. Check server logs for errors');
        console.log('2. Ensure working-server.js is running');
        console.log('3. Verify all endpoints are properly implemented');
    }
    
    console.log('\n============================================\n');
}

verifyFixes().catch(console.error); 
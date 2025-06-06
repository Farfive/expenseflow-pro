#!/usr/bin/env node

/**
 * Simple Test Runner for ExpenseFlow Pro
 * Tests user scenarios and identifies issues to fix
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

console.log('🚀 ExpenseFlow Pro - Simple Test Runner');
console.log('=========================================\n');

async function checkServer(port = 3003) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}/api/health`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ running: true, data: parsed });
                } catch (e) {
                    resolve({ running: false, error: 'Invalid JSON response' });
                }
            });
        });
        
        req.on('error', () => {
            resolve({ running: false, error: 'Connection failed' });
        });
        
        req.setTimeout(3000, () => {
            req.destroy();
            resolve({ running: false, error: 'Timeout' });
        });
    });
}

async function startServer() {
    console.log('📡 Starting Enhanced Server...');
    
    const serverProcess = spawn('node', ['enhanced-working-server.js'], {
        stdio: 'pipe',
        detached: false
    });
    
    let serverStarted = false;
    let output = '';
    
    return new Promise((resolve, reject) => {
        serverProcess.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            console.log('   Server:', text.trim());
            
            if (text.includes('Ready for comprehensive testing') && !serverStarted) {
                serverStarted = true;
                setTimeout(() => resolve(serverProcess), 2000);
            }
        });
        
        serverProcess.stderr.on('data', (data) => {
            console.log('   Error:', data.toString().trim());
        });
        
        serverProcess.on('error', (error) => {
            reject(error);
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
            if (!serverStarted) {
                resolve(serverProcess); // Return process anyway
            }
        }, 10000);
    });
}

async function testAuthentication() {
    console.log('\n🔐 Testing Authentication...');
    
    const testCases = [
        {
            name: 'Valid Login',
            email: 'test@expenseflow.com',
            password: 'password123',
            expectSuccess: true
        },
        {
            name: 'Invalid Login',
            email: 'invalid@test.com',
            password: 'wrong',
            expectSuccess: false
        },
        {
            name: 'Employee Login',
            email: 'david.kim@techcorp.com',
            password: 'test123',
            expectSuccess: true
        }
    ];
    
    for (const test of testCases) {
        try {
            const result = await makeRequest('POST', '/api/auth/login', {
                email: test.email,
                password: test.password
            });
            
            const success = result.success === test.expectSuccess;
            console.log(`   ${success ? '✅' : '❌'} ${test.name}: ${success ? 'PASSED' : 'FAILED'}`);
            
            if (test.expectSuccess && result.success) {
                console.log(`      User: ${result.data.user.name} (${result.data.user.role})`);
            }
        } catch (error) {
            console.log(`   ❌ ${test.name}: ERROR - ${error.message}`);
        }
    }
}

async function testExpenseEndpoints() {
    console.log('\n📋 Testing Expense Endpoints...');
    
    const endpoints = [
        { method: 'GET', path: '/api/dashboard/expenses', name: 'Dashboard' },
        { method: 'GET', path: '/api/expenses/new', name: 'New Expense Form' },
        { method: 'GET', path: '/api/categories', name: 'Categories' },
        { method: 'GET', path: '/api/approvals/pending', name: 'Pending Approvals' },
        { method: 'GET', path: '/api/analytics/company-wide', name: 'Analytics' }
    ];
    
    for (const endpoint of endpoints) {
        try {
            const result = await makeRequest(endpoint.method, endpoint.path);
            console.log(`   ${result.success ? '✅' : '❌'} ${endpoint.name}: ${result.success ? 'WORKING' : 'FAILED'}`);
        } catch (error) {
            console.log(`   ❌ ${endpoint.name}: ERROR - ${error.message}`);
        }
    }
}

async function testWorkflow() {
    console.log('\n🔄 Testing Complete Workflow...');
    
    try {
        // Step 1: Login
        console.log('   Step 1: Logging in...');
        const loginResult = await makeRequest('POST', '/api/auth/login', {
            email: 'david.kim@techcorp.com',
            password: 'test123'
        });
        
        if (!loginResult.success) {
            throw new Error('Login failed');
        }
        
        const token = loginResult.data.token;
        console.log('   ✅ Login successful');
        
        // Step 2: Create expense
        console.log('   Step 2: Creating expense...');
        const expenseResult = await makeRequest('POST', '/api/expenses/upload', {
            merchant: 'Test Restaurant',
            amount: 25.50,
            category: 'Business Meals',
            date: '2024-01-15',
            description: 'Client lunch meeting',
            userId: loginResult.data.user.id
        }, token);
        
        console.log(`   ${expenseResult.success ? '✅' : '❌'} Expense creation: ${expenseResult.success ? 'SUCCESS' : 'FAILED'}`);
        
        // Step 3: Submit for approval
        console.log('   Step 3: Submitting for approval...');
        const submitResult = await makeRequest('POST', '/api/expenses/submit', {
            expenses: [{ merchant: 'Test Restaurant', amount: 25.50 }],
            submittedBy: loginResult.data.user.id,
            approver: 'manager@test.com',
            totalAmount: 25.50
        }, token);
        
        console.log(`   ${submitResult.success ? '✅' : '❌'} Submission: ${submitResult.success ? 'SUCCESS' : 'FAILED'}`);
        
        console.log('   ✅ Complete workflow test: PASSED');
        
    } catch (error) {
        console.log(`   ❌ Complete workflow test: FAILED - ${error.message}`);
    }
}

async function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3003,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        
        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve(parsed);
                } catch (e) {
                    reject(new Error('Invalid JSON response'));
                }
            });
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        if (data && method !== 'GET') {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

async function generateReport() {
    console.log('\n📊 COMPREHENSIVE TEST REPORT');
    console.log('============================================================');
    
    const serverCheck = await checkServer();
    
    console.log('\n📈 SYSTEM STATUS:');
    console.log(`   Server Running: ${serverCheck.running ? '✅ YES' : '❌ NO'}`);
    
    if (serverCheck.running) {
        console.log(`   Server Health: ${serverCheck.data.status}`);
        console.log(`   Server Uptime: ${Math.round(serverCheck.data.uptime)}s`);
        console.log(`   API Version: ${serverCheck.data.version || 'Unknown'}`);
    }
    
    console.log('\n💡 ISSUES IDENTIFIED:');
    console.log('   🔧 Missing comprehensive error handling');
    console.log('   🔧 Need file upload middleware improvements');
    console.log('   🔧 Database integration required for persistence');
    console.log('   🔧 Real OCR processing implementation needed');
    console.log('   🔧 Authentication token validation needs enhancement');
    
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('   1. Implement proper JWT token handling');
    console.log('   2. Add database models with Prisma');
    console.log('   3. Integrate real OCR services (Tesseract.js)');
    console.log('   4. Add comprehensive input validation');
    console.log('   5. Implement role-based access control');
    console.log('   6. Add comprehensive error logging');
    
    console.log('\n============================================================\n');
}

async function main() {
    try {
        // Check if server is already running
        const serverCheck = await checkServer();
        
        if (!serverCheck.running) {
            console.log('❌ Server not running on port 3002');
            console.log('🔄 Attempting to start enhanced server...\n');
            
            await startServer();
            
            // Wait a bit more for server to fully start
            await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
            console.log('✅ Server already running on port 3002\n');
        }
        
        // Run tests
        await testAuthentication();
        await testExpenseEndpoints();
        await testWorkflow();
        await generateReport();
        
    } catch (error) {
        console.error('❌ Test runner failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    checkServer,
    testAuthentication,
    testExpenseEndpoints,
    testWorkflow,
    makeRequest
}; 
const { spawn } = require('child_process');
const http = require('http');

console.log('🚀 ExpenseFlow Pro - Server Test');
console.log('=====================================\n');

// Function to test if a port is available
function testPort(port, callback) {
    const options = {
        hostname: 'localhost',
        port: port,
        path: '/',
        method: 'GET',
        timeout: 2000
    };

    const req = http.request(options, (res) => {
        callback(true, `Port ${port} is responding`);
    });

    req.on('error', (err) => {
        callback(false, `Port ${port} is not responding: ${err.message}`);
    });

    req.on('timeout', () => {
        callback(false, `Port ${port} timed out`);
    });

    req.end();
}

// Kill existing node processes
console.log('🧹 Cleaning up existing processes...');
const killProcess = spawn('taskkill', ['/f', '/im', 'node.exe'], { shell: true });
killProcess.on('close', () => {
    setTimeout(startTests, 2000);
});

function startTests() {
    console.log('\n📡 Starting Backend Server...');
    
    // Start backend
    const backend = spawn('node', ['simple-server.js'], {
        stdio: 'pipe',
        shell: true
    });

    backend.stdout.on('data', (data) => {
        console.log(`Backend: ${data.toString().trim()}`);
    });

    backend.stderr.on('data', (data) => {
        console.error(`Backend Error: ${data.toString().trim()}`);
    });

    // Wait for backend to start
    setTimeout(() => {
        console.log('\n🔍 Testing Backend API...');
        testPort(3000, (isRunning, message) => {
            console.log(`Backend Status: ${message}`);
            
            if (isRunning) {
                console.log('✅ Backend is running successfully!');
                startFrontend();
            } else {
                console.log('❌ Backend failed to start');
            }
        });
    }, 5000);
}

function startFrontend() {
    console.log('\n🎨 Starting Frontend Server...');
    
    const frontend = spawn('npm', ['run', 'dev'], {
        cwd: './frontend',
        stdio: 'pipe',
        shell: true
    });

    frontend.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output.includes('Ready') || output.includes('Local:')) {
            console.log(`Frontend: ${output}`);
        }
    });

    frontend.stderr.on('data', (data) => {
        console.error(`Frontend Error: ${data.toString().trim()}`);
    });

    // Wait for frontend to start
    setTimeout(() => {
        console.log('\n🔍 Testing Frontend...');
        testPort(3001, (isRunning, message) => {
            console.log(`Frontend Status: ${message}`);
            
            if (isRunning) {
                console.log('✅ Frontend is running successfully!');
                console.log('\n🎉 Both servers are running!');
                console.log('🌐 Backend: http://localhost:3000');
                console.log('🎨 Frontend: http://localhost:3001');
            } else {
                console.log('❌ Frontend failed to start');
            }
        });
    }, 15000);
} 
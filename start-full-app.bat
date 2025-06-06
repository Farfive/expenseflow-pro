@echo off
title ExpenseFlow Pro - Complete Startup
echo 🚀 ExpenseFlow Pro - Complete Application Startup
echo ==================================================

echo.
echo 1. Cleaning up existing processes...
echo    Stopping any running Node.js processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM npm.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo 2. Starting Backend Server...
echo    Backend will run on: http://localhost:3002
echo    API will be available at: http://localhost:3002/api
echo.
start "ExpenseFlow Backend" cmd /c "title ExpenseFlow Backend Server && echo 🚀 ExpenseFlow Pro Backend Server && echo ============================= && node working-server.js && pause"

echo.
echo 3. Waiting for backend to initialize...
timeout /t 8 /nobreak >nul

echo.
echo 4. Testing backend connection...
curl -s http://localhost:3002/api/health 2>nul
if %errorlevel% neq 0 (
    echo    ❌ Backend not responding yet, waiting longer...
    timeout /t 5 /nobreak >nul
) else (
    echo    ✅ Backend is responding!
)

echo.
echo 5. Checking if frontend directory exists...
if exist "frontend\" (
    echo    ✅ Frontend directory found
    cd frontend
    
    echo.
    echo 6. Installing frontend dependencies (if needed)...
    if not exist "node_modules\" (
        echo    Installing npm packages...
        npm install
    ) else (
        echo    ✅ Node modules already installed
    )
    
    echo.
    echo 7. Starting Frontend Development Server...
    echo    Frontend will run on: http://localhost:3000
    echo    This will open automatically in your browser
    echo.
    start "ExpenseFlow Frontend" cmd /c "title ExpenseFlow Frontend Server && echo 🌐 ExpenseFlow Pro Frontend Server && echo ============================== && npm run dev && pause"
    
    cd ..
) else (
    echo    ⚠️  Frontend directory not found!
    echo    Creating basic frontend structure...
    
    mkdir frontend 2>nul
    cd frontend
    
    echo    Creating package.json...
    echo {> package.json
    echo   "name": "expenseflow-frontend",>> package.json
    echo   "version": "1.0.0",>> package.json
    echo   "scripts": {>> package.json
    echo     "dev": "npx http-server . -p 3000 -o",>> package.json
    echo     "start": "npx http-server . -p 3000">> package.json
    echo   },>> package.json
    echo   "devDependencies": {>> package.json
    echo     "http-server": "^14.1.1">> package.json
    echo   }>> package.json
    echo }>> package.json
    
    echo    Creating index.html...
    echo ^<!DOCTYPE html^>> index.html
    echo ^<html lang="en"^>>> index.html
    echo ^<head^>>> index.html
    echo ^<meta charset="UTF-8"^>>> index.html
    echo ^<meta name="viewport" content="width=device-width, initial-scale=1.0"^>>> index.html
    echo ^<title^>ExpenseFlow Pro^</title^>>> index.html
    echo ^<style^>>> index.html
    echo body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }>> index.html
    echo .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }>> index.html
    echo .header { text-align: center; margin-bottom: 30px; }>> index.html
    echo .status { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }>> index.html
    echo .api-test { background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; }>> index.html
    echo button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin: 5px; }>> index.html
    echo button:hover { background: #0056b3; }>> index.html
    echo .result { background: #f8f9fa; border: 1px solid #dee2e6; padding: 10px; margin: 10px 0; border-radius: 3px; font-family: monospace; white-space: pre-wrap; }>> index.html
    echo .success { color: #28a745; }>> index.html
    echo .error { color: #dc3545; }>> index.html
    echo ^</style^>>> index.html
    echo ^</head^>>> index.html
    echo ^<body^>>> index.html
    echo ^<div class="container"^>>> index.html
    echo ^<div class="header"^>>> index.html
    echo ^<h1^>🚀 ExpenseFlow Pro^</h1^>>> index.html
    echo ^<p^>Modern Expense Management Platform^</p^>>> index.html
    echo ^</div^>>> index.html
    echo ^<div class="status"^>>> index.html
    echo ^<h2^>✅ System Status^</h2^>>> index.html
    echo ^<p id="backend-status"^>🔄 Checking backend connection...^</p^>>> index.html
    echo ^</div^>>> index.html
    echo ^<div class="api-test"^>>> index.html
    echo ^<h2^>🧪 API Testing^</h2^>>> index.html
    echo ^<button onclick="testHealth()"^>Test Health^</button^>>> index.html
    echo ^<button onclick="testLogin()"^>Test Login^</button^>>> index.html
    echo ^<button onclick="testDashboard()"^>Test Dashboard^</button^>>> index.html
    echo ^<button onclick="testCategories()"^>Test Categories^</button^>>> index.html
    echo ^<div id="test-results"^>^</div^>>> index.html
    echo ^</div^>>> index.html
    echo ^<div class="api-test"^>>> index.html
    echo ^<h2^>👥 Test Users^</h2^>>> index.html
    echo ^<p^>^<strong^>Admin:^</strong^> test@expenseflow.com / password123^</p^>>> index.html
    echo ^<p^>^<strong^>Employee:^</strong^> david.kim@techcorp.com / test123^</p^>>> index.html
    echo ^<p^>^<strong^>Manager:^</strong^> jennifer.smith@techcorp.com / test123^</p^>>> index.html
    echo ^</div^>>> index.html
    echo ^</div^>>> index.html
    echo ^<script^>>> index.html
    echo const API_BASE = 'http://localhost:3002/api';>> index.html
    echo async function checkBackend() {>> index.html
    echo   try {>> index.html
    echo     const response = await fetch(`${API_BASE}/health`);>> index.html
    echo     const data = await response.json();>> index.html
    echo     document.getElementById('backend-status').innerHTML = '✅ Backend connected: ' + data.status;>> index.html
    echo   } catch (error) {>> index.html
    echo     document.getElementById('backend-status').innerHTML = '❌ Backend connection failed: ' + error.message;>> index.html
    echo   }>> index.html
    echo }>> index.html
    echo async function testAPI(endpoint, method = 'GET', body = null, name = 'Test') {>> index.html
    echo   const resultsDiv = document.getElementById('test-results');>> index.html
    echo   try {>> index.html
    echo     const options = { method, headers: { 'Content-Type': 'application/json' } };>> index.html
    echo     if (body) options.body = JSON.stringify(body);>> index.html
    echo     const response = await fetch(`${API_BASE}${endpoint}`, options);>> index.html
    echo     const data = await response.json();>> index.html
    echo     resultsDiv.innerHTML += `^<div class="result success"^>${name} ✅:\n${JSON.stringify(data, null, 2)}^</div^>`;>> index.html
    echo   } catch (error) {>> index.html
    echo     resultsDiv.innerHTML += `^<div class="result error"^>${name} ❌:\n${error.message}^</div^>`;>> index.html
    echo   }>> index.html
    echo }>> index.html
    echo function testHealth() { testAPI('/health', 'GET', null, 'Health Check'); }>> index.html
    echo function testLogin() { testAPI('/auth/login', 'POST', {email: 'test@expenseflow.com', password: 'password123'}, 'Admin Login'); }>> index.html
    echo function testDashboard() { testAPI('/dashboard/expenses', 'GET', null, 'Dashboard'); }>> index.html
    echo function testCategories() { testAPI('/categories', 'GET', null, 'Categories'); }>> index.html
    echo checkBackend();>> index.html
    echo setInterval(checkBackend, 10000);>> index.html
    echo ^</script^>>> index.html
    echo ^</body^>>> index.html
    echo ^</html^>>> index.html
    
    echo    Installing http-server...
    npm install http-server --save-dev
    
    echo.
    echo    Starting simple frontend server...
    start "ExpenseFlow Frontend" cmd /c "title ExpenseFlow Frontend Server && echo 🌐 ExpenseFlow Pro Frontend Server && echo ============================== && npx http-server . -p 3000 -o && pause"
    
    cd ..
)

echo.
echo 8. Waiting for frontend to start...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo 🎉 ExpenseFlow Pro is now running!
echo ========================================
echo.
echo 📍 URLs:
echo    🌐 Frontend: http://localhost:3000
echo    🔧 Backend API: http://localhost:3002
echo    💚 Health Check: http://localhost:3002/api/health
echo.
echo 🔑 Test Credentials:
echo    📧 Admin: test@expenseflow.com / password123
echo    📧 Employee: david.kim@techcorp.com / test123
echo    📧 Manager: jennifer.smith@techcorp.com / test123
echo.
echo ✅ Both servers should open automatically in new windows
echo ✅ Frontend will open in your default browser
echo.
echo Press any key to run comprehensive tests...
pause

echo.
echo 🧪 Running comprehensive tests...
node comprehensive-user-scenarios-test.js

echo.
echo 📊 Running verification tests...  
node verify-fixes.js

echo.
echo ========================================
echo ✅ Startup and testing completed!
echo.
echo If you see any errors above, try:
echo 1. Close all browser tabs for localhost:3000 and localhost:3002
echo 2. Run this script again
echo 3. Check Windows Firewall settings
echo ========================================
pause 
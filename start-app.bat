@echo off
echo 🚀 Starting ExpenseFlow Pro Application
echo ========================================

echo.
echo 1. Stopping any existing Node.js processes...
taskkill /F /IM node.exe 2>nul

echo.
echo 2. Starting backend server...
echo    Backend will run on: http://localhost:3002
echo    API available at: http://localhost:3002/api
echo.

start "ExpenseFlow Backend" cmd /k "echo ExpenseFlow Pro Backend Server && echo ========================== && node working-server.js"

echo.
echo 3. Waiting for server to start...
timeout /t 5 /nobreak >nul

echo.
echo 4. Testing server health...
curl -s http://localhost:3002/api/health

echo.
echo 5. Testing authentication...
curl -s -X POST http://localhost:3002/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"test@expenseflow.com\",\"password\":\"password123\"}"

echo.
echo ========================================
echo ✅ ExpenseFlow Pro is now running!
echo.
echo 📍 Backend: http://localhost:3002
echo 📍 API Docs: http://localhost:3002
echo 📍 Health Check: http://localhost:3002/api/health
echo.
echo Available test users:
echo   📧 test@expenseflow.com (admin) - password123
echo   📧 david.kim@techcorp.com (employee) - test123  
echo   📧 jennifer.smith@techcorp.com (manager) - test123
echo.
echo Press any key to run comprehensive tests...
pause

echo.
echo Running comprehensive user scenario tests...
node comprehensive-user-scenarios-test.js

echo.
echo Tests completed! Check results above.
pause 
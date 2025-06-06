@echo off
echo 🚀 Starting ExpenseFlow Pro Automated Test Suite
echo ===============================================

echo.
echo 📡 Starting backend server...
start /B node working-server.js

echo.
echo ⏳ Waiting for server to start...
timeout /t 5 >nul

echo.
echo 🤖 Running automated user flow test...
node automated-user-flow-test.js

echo.
echo ✅ Test completed!
pause 
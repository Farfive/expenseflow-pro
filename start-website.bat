@echo off
echo Starting ExpenseFlow Pro Website...
echo.

echo 🔧 Killing existing Node.js processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo 🚀 Starting Backend Server (Port 3002)...
start "Backend Server" cmd /k "node working-server.js"
timeout /t 3 >nul

echo 🌐 Starting Frontend Server (Port 3000)...
start "Frontend Server" cmd /k "cd frontend && npm run dev"
timeout /t 3 >nul

echo.
echo ✅ Servers are starting up!
echo.
echo 📍 Your ExpenseFlow Pro website will be available at:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:3002
echo    Test:     http://localhost:3000/test-analytics
echo.
echo 🔍 Check the opened terminal windows for server status.
echo Press any key to exit this script...
pause >nul 
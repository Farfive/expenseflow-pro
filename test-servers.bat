@echo off
cls
echo ========================================
echo   ExpenseFlow Pro - Server Test
echo ========================================
echo.

REM Kill existing processes
echo Cleaning up existing processes...
taskkill /f /im node.exe 2>nul
timeout /t 3 /nobreak >nul

echo.
echo Testing Backend Server...
echo Starting backend on port 3000...
start "Backend Test" cmd /c "node simple-server.js"

timeout /t 8 /nobreak >nul

echo.
echo Testing Backend API...
curl -s http://localhost:3000/api/auth/me
echo.

echo.
echo Checking if backend is running...
netstat -an | findstr ":3000"

echo.
echo Testing Frontend...
echo Starting frontend...
start "Frontend Test" cmd /c "cd frontend && npm run dev"

timeout /t 15 /nobreak >nul

echo.
echo Checking if frontend is running...
netstat -an | findstr ":3001"

echo.
echo Opening application in browser...
start http://localhost:3001

echo.
echo Test complete! Check the Backend Test and Frontend Test windows for details.
pause 
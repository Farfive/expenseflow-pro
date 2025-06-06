@echo off
title ExpenseFlow Pro - Simple Start
echo.
echo 🚀 Starting ExpenseFlow Pro...
echo.

echo Step 1: Cleaning up processes...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM npm.exe >nul 2>&1

echo Step 2: Starting backend...
start "Backend" cmd /c "echo Backend starting... && node working-server.js && pause"

echo Step 3: Waiting 10 seconds...
timeout /t 10 /nobreak >nul

echo Step 4: Starting frontend...
cd frontend
start "Frontend" cmd /c "echo Frontend starting... && npm run dev && pause"
cd ..

echo Step 5: Waiting 15 seconds...
timeout /t 15 /nobreak >nul

echo Step 6: Opening browser...
start http://localhost:3000
start http://localhost:3000/test-simple
start http://localhost:3002/api/health

echo.
echo ✅ ExpenseFlow Pro should now be running!
echo.
echo URLs to check:
echo - http://localhost:3000 (main app)
echo - http://localhost:3000/test-simple (test page)
echo - http://localhost:3002/api/health (backend)
echo.
pause 
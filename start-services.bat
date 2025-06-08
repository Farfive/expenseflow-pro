@echo off
echo ================================================
echo Starting ExpenseFlow Pro Services
echo ================================================

echo Killing existing Node.js processes...
taskkill /F /IM node.exe 2>nul >nul
timeout /t 2 /nobreak >nul

echo.
echo Starting Backend Server in new window...
start "ExpenseFlow Backend" cmd /k "echo BACKEND SERVER STARTING... && node simple-server.js"

echo.
echo Waiting 3 seconds for backend...
timeout /t 3 /nobreak >nul

echo.
echo Starting Frontend Server in new window...
start "ExpenseFlow Frontend" cmd /k "echo FRONTEND SERVER STARTING... && cd frontend && set NEXT_TELEMETRY_DISABLED=1 && set TURBO_TELEMETRY_DISABLED=1 && npm run dev"

echo.
echo ================================================
echo Both services are starting in separate windows!
echo ================================================
echo.
echo Backend: http://localhost:3002
echo Frontend: http://localhost:3000
echo.
echo Check the separate command windows for status.
echo Close this window when done.
pause 
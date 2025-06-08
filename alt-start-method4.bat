@echo off
echo ================================================
echo ExpenseFlow Pro - Alternative Startup Method 4
echo Using PowerShell Process Management
echo ================================================

echo.
echo [1/3] Checking and clearing ports...
powershell -Command "Get-NetTCPConnection -LocalPort 3000,3002 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo.
echo [2/3] Starting Backend with PowerShell...
powershell -Command "Start-Process cmd -ArgumentList '/k', 'cd /d %~dp0 && echo [BACKEND] Starting ExpenseFlow Pro Backend... && node simple-server.js' -WindowStyle Normal"

echo.
echo [3/3] Waiting and starting Frontend...
timeout /t 5 /nobreak
cd frontend
powershell -Command "Start-Process cmd -ArgumentList '/k', 'cd /d %cd% && echo [FRONTEND] Starting ExpenseFlow Pro Frontend... && npm run dev' -WindowStyle Normal"

echo.
echo ================================================
echo Services started with PowerShell management!
echo Check the separate command windows for logs.
echo ================================================
echo.
echo Backend: http://localhost:3002
echo Frontend: http://localhost:3000
echo.
pause 
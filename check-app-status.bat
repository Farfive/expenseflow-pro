@echo off
echo ExpenseFlow Pro - Status Check
echo ================================
echo.

echo Checking Backend (Port 4001)...
netstat -ano | findstr :4001 >nul
if %errorlevel% == 0 (
    echo ✅ Backend is running on port 4001
    curl -s http://localhost:4001/api/health 2>nul && echo   - API is responding
) else (
    echo ❌ Backend is NOT running
)

echo.
echo Checking Frontend (Port 4000)...
netstat -ano | findstr :4000 >nul
if %errorlevel% == 0 (
    echo ✅ Frontend is running on port 4000
) else (
    echo ❌ Frontend is NOT running
)

echo.
echo 🌐 URLs:
echo   Frontend: http://localhost:4000
echo   Backend API: http://localhost:4001/api
echo   Backend Health: http://localhost:4001/api/health
echo.
pause 
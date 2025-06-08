@echo off
echo ================================================
echo CURRENT STATUS CHECK
echo ================================================

echo.
echo 1. CHECKING PROCESSES:
echo ========================
tasklist | findstr node.exe
if %errorlevel% equ 0 (
    echo ✅ Node.js processes found
) else (
    echo ❌ No Node.js processes running
)

echo.
echo 2. CHECKING PORTS:
echo ==================
netstat -ano | findstr :3000
if %errorlevel% equ 0 (
    echo ✅ Port 3000 is in use
) else (
    echo ❌ Port 3000 is free
)

netstat -ano | findstr :3002
if %errorlevel% equ 0 (
    echo ✅ Port 3002 is in use
) else (
    echo ❌ Port 3002 is free
)

echo.
echo 3. CHECKING BACKEND:
echo ====================
curl -s http://localhost:3002 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend is responding
) else (
    echo ❌ Backend not responding
)

echo.
echo 4. CHECKING FRONTEND:
echo =====================
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Frontend is responding
) else (
    echo ❌ Frontend not responding
)

echo.
echo 5. CHECKING FILES:
echo ==================
if exist simple-server.js (
    echo ✅ simple-server.js
) else (
    echo ❌ simple-server.js missing
)

if exist frontend\package.json (
    echo ✅ frontend\package.json
) else (
    echo ❌ frontend\package.json missing
)

if exist frontend\next.config.simple.js (
    echo ✅ frontend\next.config.simple.js
) else (
    echo ❌ frontend\next.config.simple.js missing
)

echo.
echo ================================================
echo STATUS CHECK COMPLETE
echo ================================================
pause 
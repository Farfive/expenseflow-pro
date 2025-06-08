@echo off
title ExpenseFlow Pro - Ultra Fast Start
color 0F

echo.
echo ==========================================
echo    EXPENSEFLOW PRO - ULTRA FAST START
echo ==========================================
echo.

REM Kill all Node processes
echo [1/7] Killing all Node processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Clear all caches for fresh start
echo [2/7] Clearing all caches...
cd frontend
if exist .next rmdir /s /q .next >nul 2>&1
if exist node_modules\.cache rmdir /s /q node_modules\.cache >nul 2>&1
if exist .swc rmdir /s /q .swc >nul 2>&1

REM Backup original files and use ultra-fast versions
echo [3/7] Switching to ultra-fast configuration...
if exist package.json copy package.json package.json.backup >nul 2>&1
if exist next.config.js copy next.config.js next.config.js.backup >nul 2>&1

copy package.dev.json package.json >nul 2>&1
copy next.config.ultra-fast.js next.config.js >nul 2>&1

REM Install minimal dependencies
echo [4/7] Installing minimal dependencies (this will be fast)...
npm install --silent --no-audit --no-fund

cd ..

REM Start backend
echo [5/7] Starting backend on port 4005...
start "Backend" cmd /k "title Backend Server && echo Backend starting... && set PORT=4005 && node simple-server.js"

REM Wait for backend
timeout /t 5 /nobreak >nul

REM Start frontend with all optimizations
echo [6/7] Starting ultra-fast frontend...
start "Frontend" cmd /k "title Frontend Ultra Fast && echo Starting ultra-fast frontend... && cd frontend && set PORT=4000 && set NEXT_PUBLIC_API_URL=http://localhost:4005 && set NODE_OPTIONS=--max-old-space-size=8192 && npm run dev:ultra"

REM Wait and test
echo [7/7] Waiting for ultra-fast compilation...
timeout /t 15 /nobreak >nul

echo.
echo Testing services...
curl -s http://localhost:4005/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend is ready
) else (
    echo ⏳ Backend still starting...
)

curl -s http://localhost:4000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Frontend is ready - Opening browser!
    start http://localhost:4000
) else (
    echo ⏳ Frontend still compiling (should be ready soon)
    timeout /t 10 /nobreak >nul
    start http://localhost:4000
)

echo.
echo ==========================================
echo       ULTRA FAST START COMPLETE!
echo ==========================================
echo.
echo ⚡ OPTIMIZATIONS APPLIED:
echo   - Minimal dependencies (only essentials)
echo   - Ultra-fast Next.js config
echo   - Turbo mode enabled
echo   - All caches cleared
echo   - Source maps disabled
echo   - Type checking disabled
echo   - Image optimization disabled
echo.
echo 🚀 Services:
echo   Backend:  http://localhost:4005/api/health
echo   Frontend: http://localhost:4000
echo.
echo ⏱️ Expected startup time: 15-30 seconds
echo.
echo 📝 To restore full features later:
echo   cd frontend
echo   copy package.json.backup package.json
echo   copy next.config.js.backup next.config.js
echo   npm install
echo.
echo Press any key to close...
pause >nul 
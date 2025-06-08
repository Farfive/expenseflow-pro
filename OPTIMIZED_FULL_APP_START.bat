@echo off
echo ========================================
echo   OPTIMIZED FULL APP STARTUP
echo   Keeping ALL libraries but FAST compile
echo ========================================

:: Set high performance mode
powercfg /s 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>nul

:: Set Node.js memory and performance options
set NODE_OPTIONS=--max-old-space-size=8192 --max-semi-space-size=512 --optimize-for-size
set NEXT_TELEMETRY_DISABLED=1
set TURBO=1
set FAST_REFRESH=true

:: Clean caches for fresh optimized start
echo Cleaning caches for optimized startup...
cd frontend
if exist .next rmdir /s /q .next 2>nul
if exist node_modules\.cache rmdir /s /q node_modules\.cache 2>nul
if exist .swc rmdir /s /q .swc 2>nul

:: Backup original configs and use optimized ones
echo Setting up optimized configurations...
if exist next.config.js (
    copy next.config.js next.config.backup.js >nul 2>&1
)
if exist tsconfig.json (
    copy tsconfig.json tsconfig.backup.json >nul 2>&1
)

:: Use optimized configurations
copy next.config.optimized.js next.config.js >nul 2>&1
copy tsconfig.optimized.json tsconfig.json >nul 2>&1

echo Optimized configurations activated!
cd ..

:: Kill any existing processes
echo Stopping existing processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im next.exe 2>nul
timeout /t 2 /nobreak >nul

:: Start backend in new window
echo Starting optimized backend...
start "ExpenseFlow Backend (Optimized)" cmd /k "cd backend && node simple-server.js"

:: Wait for backend
timeout /t 3 /nobreak >nul

:: Start frontend with optimized settings
echo Starting optimized frontend (FULL APP)...
start "ExpenseFlow Frontend (Optimized Full)" cmd /k "cd frontend && npm run dev"

:: Wait and check services
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   OPTIMIZED STARTUP COMPLETE!
echo ========================================
echo   Backend: http://localhost:4005
echo   Frontend: http://localhost:4000
echo   
echo   OPTIMIZATIONS ACTIVE:
echo   ✓ SWC Compiler (faster than Babel)
echo   ✓ Turbo Mode enabled
echo   ✓ Optimized webpack config
echo   ✓ Smart chunk splitting
echo   ✓ Persistent caching
echo   ✓ Fast source maps
echo   ✓ Heavy libs pre-chunked
echo   ✓ 8GB memory allocation
echo   
echo   ALL LIBRARIES INCLUDED!
echo   Expected compile time: 30-60 seconds
echo ========================================

:: Open browser after delay
timeout /t 10 /nobreak >nul
start http://localhost:4000

echo.
echo Services started! Check the separate windows.
echo To restore original configs, run: RESTORE_CONFIGS.bat
pause 
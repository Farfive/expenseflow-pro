@echo off
echo ========================================
echo   ExpenseFlow Pro - Enhanced Version
echo ========================================
echo.
echo Starting Enhanced Backend with:
echo - Real OCR Processing (Tesseract.js)
echo - Actual File Exports (Excel/PDF/CSV)
echo - Settings Persistence
echo - Integration Management
echo - Workflow Editor
echo.

REM Kill any existing processes on ports 4000 and 4001
echo Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":4000" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find ":4001" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul

echo.
echo Installing required dependencies...
call npm install --save xlsx jspdf jspdf-autotable tesseract.js sharp

echo.
echo Starting Enhanced Backend on port 4001...
start "Enhanced Backend" cmd /k "node enhanced-backend.js"

timeout /t 3 /nobreak >nul

echo.
echo Starting Frontend on port 4000...
start "Frontend" cmd /k "cd frontend && npm run dev -- --port 4000"

echo.
echo ========================================
echo   Application Starting...
echo ========================================
echo.
echo Backend: http://localhost:4001
echo Frontend: http://localhost:4000
echo.
echo Enhanced Features Available:
echo - Real OCR document processing
echo - Excel/PDF/CSV file exports
echo - Persistent settings storage
echo - Third-party integrations
echo - Custom workflow editor
echo.
echo Press any key to open the application...
pause >nul

start http://localhost:4000

echo.
echo Application launched! Check the terminal windows for logs.
echo Press any key to exit this launcher...
pause >nul 
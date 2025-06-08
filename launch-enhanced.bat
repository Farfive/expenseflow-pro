@echo off
cls
echo ========================================
echo   ExpenseFlow Pro - Enhanced Edition
echo ========================================
echo.
echo 🚀 Starting Enhanced Version with:
echo   ✅ Real File Exports (Excel/PDF/CSV)
echo   ✅ OCR Processing (Tesseract.js)
echo   ✅ Settings Persistence
echo   ✅ Integration Management
echo   ✅ Workflow Editor
echo.

REM Kill existing processes
echo 🔄 Cleaning up existing processes...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

REM Install dependencies if needed
echo 📦 Checking dependencies...
if not exist "node_modules\xlsx" (
    echo Installing required packages...
    call npm install xlsx jspdf jspdf-autotable tesseract.js sharp --silent
)

echo.
echo 🖥️  Starting Enhanced Backend (Port 4001)...
start "Enhanced Backend" cmd /k "echo Enhanced Backend Starting... && node enhanced-backend.js"

timeout /t 3 /nobreak >nul

echo 🌐 Starting Frontend (Port 4000)...
start "Frontend" cmd /k "echo Frontend Starting... && cd frontend && npm run dev -- --port 4000"

timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   🎉 Enhanced ExpenseFlow Pro Ready!
echo ========================================
echo.
echo 🔗 Application URLs:
echo   Frontend: http://localhost:4000
echo   Backend:  http://localhost:4001/api
echo.
echo 🆕 New Features Available:
echo   📊 Real Excel/PDF exports
echo   📄 OCR document processing
echo   ⚙️  Persistent settings
echo   🔗 Third-party integrations
echo   📋 Custom workflow editor
echo.

REM Wait a bit more then open browser
timeout /t 3 /nobreak >nul
echo 🌐 Opening application in browser...
start http://localhost:4000

echo.
echo ✅ Application launched successfully!
echo.
echo 💡 Tips:
echo   - Test file exports in any data section
echo   - Upload receipts for real OCR processing
echo   - Configure integrations in Settings
echo   - Create custom workflows
echo.
echo Press any key to exit this launcher...
pause >nul 
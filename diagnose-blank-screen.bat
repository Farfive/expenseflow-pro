@echo off
echo ExpenseFlow Pro - Blank Screen Diagnosis
echo ==========================================
echo.

echo 1. Testing frontend HTTP response...
curl -s -I http://localhost:4000
echo.

echo 2. Testing if HTML is being served...
curl -s http://localhost:4000 | findstr /C:"ExpenseFlow" /C:"html" /C:"body"
echo.

echo 3. Checking frontend Next.js status...
curl -s http://localhost:4000/_next/static/
echo.

echo 4. Testing simple endpoint...
curl -s "http://localhost:4000/api/health" 2>nul || echo Frontend API proxy not working

echo.
echo 5. Browser Debug Instructions:
echo ================================
echo 1. Open http://localhost:4000 in your browser
echo 2. Press F12 to open Developer Tools
echo 3. Check the Console tab for JavaScript errors
echo 4. Check the Network tab to see if files are loading
echo 5. Look for any RED errors in the console
echo.
echo Common issues to look for:
echo - "Failed to load resource" errors
echo - "SyntaxError" in JavaScript
echo - "Module not found" errors
echo - "Cannot read property" errors
echo.
pause 
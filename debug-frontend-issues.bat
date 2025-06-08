@echo off
echo Debugging Frontend Issues...
echo ============================
echo.

REM Kill any existing Node processes
taskkill /f /im node.exe 2>nul

echo 1. Checking Node.js version...
node --version

echo.
echo 2. Checking npm version...
npm --version

echo.
echo 3. Changing to frontend directory...
cd frontend

echo.
echo 4. Checking if node_modules exists...
if exist node_modules (
    echo ✅ node_modules exists
) else (
    echo ❌ node_modules missing - running npm install...
    npm install
)

echo.
echo 5. Checking Next.js installation...
npx next --version

echo.
echo 6. Testing TypeScript compilation...
npx tsc --noEmit

echo.
echo 7. Trying to build frontend...
npm run build

echo.
echo 8. If build succeeds, starting dev server...
npm run dev -- --port 4000

pause 
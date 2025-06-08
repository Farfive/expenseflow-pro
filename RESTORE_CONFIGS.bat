@echo off
echo ========================================
echo   RESTORING ORIGINAL CONFIGURATIONS
echo ========================================

cd frontend

:: Restore original Next.js config
if exist next.config.backup.js (
    copy next.config.backup.js next.config.js >nul 2>&1
    del next.config.backup.js >nul 2>&1
    echo ✓ Next.js config restored
) else (
    echo ! No Next.js backup found
)

:: Restore original TypeScript config
if exist tsconfig.backup.json (
    copy tsconfig.backup.json tsconfig.json >nul 2>&1
    del tsconfig.backup.json >nul 2>&1
    echo ✓ TypeScript config restored
) else (
    echo ! No TypeScript backup found
)

:: Clean optimized caches
if exist .next rmdir /s /q .next 2>nul
if exist .swc rmdir /s /q .swc 2>nul

cd ..

echo.
echo ========================================
echo   ORIGINAL CONFIGURATIONS RESTORED!
echo ========================================
echo   You can now use your original setup.
echo   Run OPTIMIZED_FULL_APP_START.bat again
echo   to switch back to optimized mode.
echo ========================================

pause 
Write-Host "🚀 Starting ExpenseFlow Pro Services" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green

# Kill existing node processes
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2

# Start Backend in new window
Write-Host "Starting Backend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; Write-Host 'BACKEND TERMINAL' -ForegroundColor Green; node simple-server.js"

# Wait for backend
Start-Sleep 3

# Start Frontend in new window
Write-Host "Starting Frontend Server..." -ForegroundColor Cyan
$frontendPath = Join-Path $PWD "frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host 'FRONTEND TERMINAL' -ForegroundColor Blue; `$env:NEXT_TELEMETRY_DISABLED='1'; `$env:TURBO_TELEMETRY_DISABLED='1'; npm run dev"

Write-Host ""
Write-Host "✅ Both services starting in separate windows!" -ForegroundColor Green
Write-Host "Backend: http://localhost:3002" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Check the separate terminal windows for status." -ForegroundColor Yellow 
Write-Host "ExpenseFlow Pro - Simple Alternative Startup" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Kill existing processes
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2

# Start Backend
Write-Host "Starting Backend Server..." -ForegroundColor Cyan
$backend = Start-Process node -ArgumentList "simple-server.js" -PassThru -NoNewWindow
Start-Sleep 3

# Start Frontend
Write-Host "Starting Frontend..." -ForegroundColor Cyan
Set-Location "frontend"
$frontend = Start-Process npm -ArgumentList "run", "dev" -PassThru -NoNewWindow

Write-Host ""
Write-Host "Services Started!" -ForegroundColor Green
Write-Host "Backend: http://localhost:3002" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop..." -ForegroundColor Yellow

# Wait for user interrupt
try {
    while ($true) {
        Start-Sleep 1
    }
} finally {
    Write-Host "Stopping services..." -ForegroundColor Red
    $backend | Stop-Process -Force -ErrorAction SilentlyContinue
    $frontend | Stop-Process -Force -ErrorAction SilentlyContinue
} 
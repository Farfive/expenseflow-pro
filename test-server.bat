@echo off
echo Testing ExpenseFlow Pro Server...
echo ===================================

echo.
echo 1. Testing server health on port 3003...
curl -s http://localhost:3003/api/health

echo.
echo 2. Testing root endpoint...
curl -s http://localhost:3003/

echo.
echo 3. Testing login with valid credentials...
curl -s -X POST http://localhost:3003/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"test@expenseflow.com\",\"password\":\"password123\"}"

echo.
echo 4. Testing login with employee credentials...
curl -s -X POST http://localhost:3003/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"david.kim@techcorp.com\",\"password\":\"test123\"}"

echo.
echo 5. Testing expenses dashboard...
curl -s http://localhost:3003/api/dashboard/expenses

echo.
echo 6. Testing categories endpoint...
curl -s http://localhost:3003/api/categories

echo.
echo 7. Testing analytics endpoint...
curl -s http://localhost:3003/api/analytics/company-wide

echo.
echo Test completed!
pause 
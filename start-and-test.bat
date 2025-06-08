@echo off
echo 🚀 Starting ExpenseFlow Pro Servers...

echo.
echo 📡 Starting Backend Server (Port 4001)...
start "Backend Server" cmd /k "node test-backend.js"

echo.
echo ⏳ Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo.
echo 🌐 Starting Frontend Server (Port 4000)...
start "Frontend Server" cmd /k "cd frontend && npm run dev -- --port 4000"

echo.
echo ⏳ Waiting for frontend to start...
timeout /t 5 /nobreak > nul

echo.
echo 🧪 Testing Server Connectivity...

echo.
echo Testing Backend Health...
curl -s http://localhost:4001/api/health || echo Backend not responding

echo.
echo Testing Frontend...
curl -s http://localhost:4000 || echo Frontend not responding

echo.
echo 📋 FUNCTIONALITY TEST CHECKLIST
echo ================================
echo.
echo 🔐 AUTHENTICATION:
echo [ ] Login with any email/password works
echo [ ] Logout functionality works
echo [ ] Session persistence works
echo.
echo 📊 DASHBOARD:
echo [ ] Dashboard loads with stats
echo [ ] Quick action buttons work
echo [ ] Recent activity displays
echo.
echo 💰 EXPENSES:
echo [ ] Expense list loads
echo [ ] Search and filters work
echo [ ] Create new expense works
echo [ ] Edit expense works
echo [ ] Delete expense works
echo [ ] Approve/reject works
echo.
echo 📄 DOCUMENTS:
echo [ ] Document list loads
echo [ ] File upload works
echo [ ] OCR processing simulates
echo [ ] Document preview works
echo [ ] Delete document works
echo.
echo 🏦 BANK STATEMENTS:
echo [ ] Statement list loads
echo [ ] Statement upload works
echo [ ] Transaction extraction works
echo [ ] Transaction matching works
echo.
echo 🏷️ CATEGORIES:
echo [ ] Category list loads
echo [ ] Create category works
echo [ ] Edit category works
echo [ ] Delete category works
echo [ ] Category filtering works
echo.
echo ⚙️ WORKFLOWS:
echo [ ] Workflow list loads
echo [ ] Workflow details display
echo [ ] Activate/deactivate works
echo [ ] Delete workflow works
echo.
echo ✅ VERIFICATION:
echo [ ] Pending expenses load
echo [ ] Expense review modal works
echo [ ] Approve expense works
echo [ ] Reject expense works
echo [ ] Comments system works
echo.
echo 📈 ANALYTICS:
echo [ ] Analytics dashboard loads
echo [ ] Time range filter works
echo [ ] Department filter works
echo [ ] Charts display data
echo.
echo 📋 REPORTS:
echo [ ] Report list loads
echo [ ] Generate report works
echo [ ] Download report works
echo [ ] Report filtering works
echo.
echo 🔔 NOTIFICATIONS:
echo [ ] Notification list loads
echo [ ] Mark as read works
echo [ ] Archive notification works
echo [ ] Delete notification works
echo [ ] Bulk actions work
echo.
echo 👥 TEAM:
echo [ ] Team member list loads
echo [ ] Member details display
echo [ ] Status change works
echo [ ] Member filtering works
echo.
echo 👤 PROFILE:
echo [ ] Profile data loads
echo [ ] Profile update works
echo [ ] Preferences save
echo [ ] Tab navigation works
echo.
echo ⚙️ SETTINGS:
echo [ ] Settings load
echo [ ] General settings save
echo [ ] Company settings save
echo [ ] Integration list displays
echo.
echo ❓ HELP:
echo [ ] Help center loads
echo [ ] FAQ expansion works
echo [ ] Search functionality works
echo [ ] Contact options display
echo.
echo 🌐 SERVERS RUNNING:
echo Backend:  http://localhost:4001
echo Frontend: http://localhost:4000
echo.
echo 📝 Open your browser and test each functionality!
echo.
pause 
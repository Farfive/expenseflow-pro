# 🚀 ExpenseFlow Pro - Quick Start Guide

## ⚡ FASTEST WAY TO RUN THE APP

### One Simple Step
1. **Double-click** `run-app.bat`
2. **Wait** for both servers to start (30-60 seconds)
3. **Browser** will open automatically

That's it! No more separate backend/frontend startup.

## 🌐 Application URLs

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | **Main Application** |
| http://localhost:3002/api/health | **Backend Health Check** |

## ✅ What You Should See

### 1. Terminal Output
```
==========================================
     EXPENSEFLOW PRO - UNIFIED STARTUP
==========================================

[1/5] Cleaning up existing processes...
[2/5] Installing dependencies...
[3/5] Starting unified application...

Starting ExpenseFlow Pro...
Backend will run on: http://localhost:3002
Frontend will run on: http://localhost:3000
```

### 2. Backend Health (http://localhost:3002/api/health)
```json
{
  "status": "healthy",
  "timestamp": "2024-01-XX...",
  "uptime": "X seconds"
}
```

### 3. Frontend Main Page (http://localhost:3000)
- ✅ **ExpenseFlow Pro** header
- ✅ **Modern interface** with clean design
- ✅ **Login functionality** (use any email/password)
- ✅ **NO BLANK PAGE!**

## 🔧 Troubleshooting

### Problem: Script Won't Start
**Solution**:
1. Install Node.js from https://nodejs.org
2. Restart your computer
3. Run `run-app.bat` as Administrator

### Problem: Blank Page on Frontend
**Solution**:
1. Wait 60 seconds for Next.js compilation
2. Refresh the page (Ctrl+F5)
3. Check browser console (F12) for errors

### Problem: Port Already in Use
**Solution**:
```bash
# The script automatically kills existing processes
# If it doesn't work, manually run:
taskkill /F /IM node.exe
taskkill /F /IM npm.exe
```

## 🎯 Expected Workflow

1. **Run script** → `run-app.bat` ✅
2. **Both services start** in one terminal ✅
3. **Wait for compilation** (30-60 seconds) ✅
4. **Open browser** → http://localhost:3000 ✅
5. **Use the application** ✅

## 🔑 Authentication

- **No auto-login** - use the login form
- **Any email/password** works for demo
- **Example**: email: `test@example.com`, password: `password`

## 📞 If Nothing Works

1. **Check Node.js**: Download from https://nodejs.org
2. **Restart Computer**: Sometimes helps with port conflicts
3. **Run as Administrator**: Right-click `run-app.bat` → "Run as administrator"
4. **Check Firewall**: Allow Node.js through Windows Firewall

## 🎉 Success Indicators

- ✅ One terminal window with both services
- ✅ No error messages in terminal
- ✅ http://localhost:3000 shows the application
- ✅ http://localhost:3002/api/health returns JSON
- ✅ Login form works with any credentials

**You should now see a fully functional ExpenseFlow Pro application!** 🚀 
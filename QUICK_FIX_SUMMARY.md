# 🚨 ExpenseFlow Pro - Quick Fix Summary

## ⚡ **IMMEDIATE SOLUTION**

**Run this command:**
```cmd
WORKING_START.bat
```

This will:
1. Kill any existing Node.js processes
2. Start backend on port **4005** (avoiding the conflict on 4001)
3. Start frontend on port **4000** 
4. Open your browser to http://localhost:4000

## 🔧 **What Was Wrong**

- **Port 4001 was already in use** by another process
- This caused the `EADDRINUSE` error when trying to start the backend
- The solution uses port **4005** for the backend instead

## 🌐 **New Port Configuration**

| Service  | Port | URL                           |
|----------|------|-------------------------------|
| Backend  | 4005 | http://localhost:4005/api     |
| Frontend | 4000 | http://localhost:4000         |

## 📋 **Manual Alternative**

If the batch file doesn't work, open **two separate terminals**:

**Terminal 1 (Backend):**
```cmd
set PORT=4005 && node simple-server.js
```

**Terminal 2 (Frontend):**
```cmd
cd frontend && set PORT=4000 && set NEXT_PUBLIC_API_URL=http://localhost:4005 && npm run dev
```

Then open: http://localhost:4000

## ✅ **Success Indicators**

You'll know it's working when:
1. Backend window shows: "Server running on http://localhost:4005"
2. Frontend window shows: "Local: http://localhost:4000"
3. Browser opens and shows the ExpenseFlow Pro login page
4. You can login with any email/password combination

## 🛠️ **If Still Having Issues**

1. **Check the Backend window** - Look for any error messages
2. **Check the Frontend window** - Look for compilation errors
3. **Try refreshing the browser** after both servers fully start
4. **Check browser console** (F12) for any network errors

## 🎯 **Key Changes Made**

- Updated backend to use port **4005** instead of 4001
- Updated frontend to connect to backend on port 4005
- Modified Next.js proxy configuration to be dynamic
- Created comprehensive cleanup and startup scripts

---

**The app should now start without the port conflict error!** 🎉 
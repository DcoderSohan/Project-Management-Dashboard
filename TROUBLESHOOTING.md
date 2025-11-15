# Troubleshooting Guide - 404 Error on Signup

## Common Causes of 404 Error

### 1. Backend Server Not Running
**Symptom:** 404 error when trying to signup

**Solution:**
1. Open a terminal
2. Navigate to backend directory: `cd backend`
3. Start the server: `npm start` or `node server.js`
4. You should see: `Server running on port 5000`
5. Verify by visiting: `http://localhost:5000/api/auth/test`

### 2. Backend Server Running on Different Port
**Symptom:** 404 error even though backend is running

**Solution:**
1. Check what port backend is running on (check console output)
2. Update `frontend/vite.config.js` proxy target:
   ```javascript
   proxy: {
     '/api': {
       target: 'http://localhost:YOUR_PORT', // Change YOUR_PORT
       changeOrigin: true,
     },
   }
   ```
3. Restart frontend dev server

### 3. Google Sheets Not Configured
**Symptom:** 500 error instead of 404

**Solution:**
1. Check `backend/config/googleSheetConfig.js`
2. Ensure Google Sheets API credentials are set up
3. Verify `GOOGLE_SHEET_ID` in `.env` file
4. Ensure "AuthUsers" sheet exists in your Google Sheet

### 4. Route Not Registered
**Symptom:** 404 error, but backend is running

**Solution:**
1. Check `backend/server.js` - should have: `app.use("/api/auth", authRoutes);`
2. Check `backend/routes/authRoutes.js` - should have: `router.post("/signup", signup);`
3. Restart backend server

## Testing Steps

1. **Test Backend Health:**
   ```
   curl http://localhost:5000/
   ```
   Should return: "Backend running"

2. **Test Auth Routes:**
   ```
   curl http://localhost:5000/api/auth/test
   ```
   Should return: `{"message":"✅ Auth routes are working!","timestamp":"..."}`

3. **Test Signup Endpoint:**
   ```
   curl -X POST http://localhost:5000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"sohansarang067@gmail.com","password":"test123"}'
   ```

4. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Try to signup
   - Check the failed request
   - Look at the URL and status code

## Debugging Checklist

- [ ] Backend server is running on port 5000
- [ ] Frontend dev server is running
- [ ] No CORS errors in browser console
- [ ] Network tab shows the request URL
- [ ] Backend logs show the request being received
- [ ] Google Sheets API is configured
- [ ] "AuthUsers" sheet exists in Google Sheet

## Quick Fix Commands

```bash
# Start backend
cd backend
npm start

# In another terminal, start frontend
cd frontend
npm run dev

# Test backend endpoint
curl http://localhost:5000/api/auth/test
```

## Still Having Issues?

1. Check browser console for detailed error messages
2. Check backend console for request logs
3. Verify the exact URL being called (check Network tab)
4. Ensure both servers are running
5. Try accessing the backend directly: `http://localhost:5000/api/auth/test`


# Troubleshooting 404 Login Error

## Problem
The login endpoint (`POST /api/auth/login`) returns a 404 error: `Failed to load resource: the server responded with a status of 404`

## Quick Diagnosis Steps

### 1. Check Server Logs
Look for these messages when the server starts:
```
✅ Auth routes registered at /api/auth
✅ All API routes registered successfully
📋 Registered Auth Routes:
   ✅ POST /api/auth/login
```

**If you DON'T see these messages:**
- Routes are not being registered
- Check for import errors in `backend/server.js`
- Verify `authRoutes` is imported correctly

### 2. Test Health Endpoint
```bash
curl https://your-backend-url.onrender.com/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "environment": "production"
}
```

**If this fails:**
- Server is not running
- Backend URL is incorrect
- Network/CORS issue

### 3. Test Route Verification Endpoint
```bash
curl https://your-backend-url.onrender.com/api/routes
```

**Expected response:**
```json
{
  "message": "Registered API routes",
  "routes": {
    "auth": [
      "POST /api/auth/login",
      ...
    ]
  }
}
```

### 4. Test Login Test Endpoint
```bash
curl -X POST https://your-backend-url.onrender.com/api/auth/login-test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**Expected response:**
```json
{
  "message": "✅ Server is receiving POST requests to /api/auth/login-test",
  ...
}
```

**If this works but `/api/auth/login` doesn't:**
- The route handler in `authRoutes` might have an issue
- Check `backend/routes/authRoutes.js` and `backend/controllers/authController.js`

### 5. Check Request Logs
When you attempt to login, look for this in server logs:
```
📡 POST /api/auth/login - [timestamp]
🔐 Login request received
```

**If you DON'T see this:**
- Request is not reaching the server
- Check `VITE_API_URL` in frontend
- Check CORS settings
- Request might be hitting a different server instance

## Common Causes and Solutions

### Cause 1: Server Not Restarted After Deployment
**Solution:**
1. Go to your Render dashboard
2. Click "Manual Deploy" → "Deploy latest commit"
3. Wait for deployment to complete
4. Check server logs for route registration messages

### Cause 2: VITE_API_URL Not Set or Incorrect
**Solution:**
1. Check frontend environment variables in Render
2. Set `VITE_API_URL` to: `https://your-backend-url.onrender.com/api`
3. Redeploy frontend
4. Clear browser cache and hard refresh (Ctrl+Shift+R)

### Cause 3: Routes Not Registered (Import Error)
**Solution:**
1. Check server logs for import errors
2. Verify `backend/routes/authRoutes.js` exists and exports correctly
3. Verify `backend/controllers/authController.js` exports `login` function
4. Check for syntax errors in these files

### Cause 4: CORS Blocking Request
**Solution:**
1. Check `backend/server.js` CORS configuration
2. Verify your frontend URL is in `allowedOrigins` array
3. Check browser console for CORS errors

### Cause 5: Request Hitting Wrong URL
**Solution:**
1. Open browser DevTools → Network tab
2. Attempt login
3. Check the actual URL being requested
4. Verify it matches: `https://your-backend-url.onrender.com/api/auth/login`

### Cause 6: Multiple Server Instances
**Solution:**
1. Check if you have multiple backend services in Render
2. Ensure only one is active
3. Verify frontend is pointing to the correct backend URL

## Debugging Checklist

- [ ] Server logs show route registration messages
- [ ] `/api/health` endpoint returns 200 OK
- [ ] `/api/routes` endpoint lists login route
- [ ] `/api/auth/test` endpoint works
- [ ] `/api/auth/login-test` endpoint works
- [ ] Server logs show incoming login requests (`📡 POST /api/auth/login`)
- [ ] `VITE_API_URL` is set correctly in frontend
- [ ] Frontend console shows correct API base URL
- [ ] No CORS errors in browser console
- [ ] Server has been restarted after code changes

## Advanced Debugging

### Check Express Router Stack
Add this to `backend/server.js` after route registration:
```javascript
console.log("🔍 Express router stack:");
app._router.stack.forEach((middleware, index) => {
  if (middleware.route) {
    console.log(`  [${index}] Route: ${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    console.log(`  [${index}] Router: ${middleware.regexp}`);
  }
});
```

### Test Login Route Directly
```bash
curl -X POST https://your-backend-url.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

**Expected responses:**
- `401 Unauthorized` - Route works, credentials wrong (GOOD!)
- `404 Not Found` - Route not registered (BAD!)
- `500 Internal Server Error` - Route works, server error (CHECK LOGS!)

## Still Not Working?

1. **Check Render Logs:**
   - Go to Render dashboard → Your backend service → Logs
   - Look for error messages, route registration, and incoming requests

2. **Verify File Structure:**
   ```
   backend/
     ├── server.js
     ├── routes/
     │   └── authRoutes.js
     └── controllers/
         └── authController.js
   ```

3. **Test Locally:**
   - Run backend locally: `cd backend && npm start`
   - Test: `curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test","password":"test"}'`
   - If it works locally but not in production, it's a deployment issue

4. **Contact Support:**
   - Share server logs
   - Share the exact error message
   - Share the request URL from browser DevTools

## Prevention

1. **Always check server logs after deployment**
2. **Test health endpoint after deployment**
3. **Keep `VITE_API_URL` environment variable set correctly**
4. **Monitor server logs for route registration messages**


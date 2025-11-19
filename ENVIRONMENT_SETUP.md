# Environment Variables Setup Guide

This guide explains how to set up environment variables for the Project Management Dashboard.

## Frontend Environment Variables

### VITE_API_URL

**Required for production deployments where frontend and backend are on different domains.**

#### Local Development
For local development, you don't need to set `VITE_API_URL`. The Vite dev server proxy will automatically forward `/api` requests to `http://localhost:5000/api`.

#### Production Deployment

**Option 1: Same Domain Deployment (Recommended for Render)**
If your frontend and backend are served from the same domain (e.g., backend serves the frontend build), you don't need to set `VITE_API_URL`. The app will automatically use `/api` as a relative path.

**Option 2: Different Domains**
If your frontend and backend are on different domains, you MUST set `VITE_API_URL`:

1. **For Render:**
   - Go to your frontend service dashboard
   - Navigate to "Environment" tab
   - Click "Add Environment Variable"
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-service.onrender.com/api`
   - Example: `https://project-management-dashboard-1-le5n.onrender.com/api`
   - Click "Save Changes"
   - Redeploy your frontend service

2. **For Vercel:**
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add new variable:
     - Key: `VITE_API_URL`
     - Value: `https://your-backend-url.com/api`
   - Redeploy

3. **For Netlify:**
   - Go to Site settings
   - Navigate to "Environment variables"
   - Add variable:
     - Key: `VITE_API_URL`
     - Value: `https://your-backend-url.com/api`
   - Redeploy

## Backend Environment Variables

The backend uses the following environment variables (set in your backend service):

- `PORT` - Server port (default: 5000, Render sets this automatically)
- `NODE_ENV` - Environment mode (production/development)
- Google Sheets API credentials (see GOOGLE_SHEETS_SETUP.md)
- Other service-specific variables

## How to Check if VITE_API_URL is Set

1. Open your browser's developer console
2. Look for the log message: `🔗 API Base URL: ...`
3. If you see `NOT SET`, the environment variable is not configured
4. If you see a URL, it's configured correctly

## Troubleshooting

### Error: "Cannot connect to server. VITE_API_URL environment variable is not set"

**Solution:**
1. If frontend and backend are on the same domain: This error should not appear. Check that your backend is running and serving the frontend build.
2. If frontend and backend are on different domains: Set `VITE_API_URL` as described above.

### Error: "API endpoint not found"

**Possible causes:**
1. Backend server is not running
2. `VITE_API_URL` points to wrong URL
3. CORS is blocking the request
4. Backend routes are not registered correctly

**Solution:**
1. Verify backend is running and accessible
2. Check `VITE_API_URL` value is correct
3. Verify CORS settings in backend allow your frontend domain
4. Check backend logs for route registration

## Example .env File (Local Development)

Create `frontend/.env.local` for local development (this file is gitignored):

```env
# Optional: Override API URL for local development
# VITE_API_URL=http://localhost:5000/api
```

Note: For local development, you typically don't need this as Vite proxy handles it automatically.


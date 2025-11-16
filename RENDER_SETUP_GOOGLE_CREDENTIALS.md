# Quick Fix: Set Google Service Account in Render

## The Problem
You're getting: "Google service account key file not found!"

This happens because the file exists locally but **not in Render** (files in `.gitignore` aren't deployed).

## The Solution (2 Minutes)

### Step 1: Copy the JSON Content

The JSON content you need is in your file. Here's what to do:

1. Open: `backend/config/google-service-account.json`
2. Copy the **entire content** (it's all on one line, that's fine)

OR run this command to get it formatted:
```bash
cd backend
node utils/prepare-google-credentials.js
```

### Step 2: Add to Render

1. Go to: https://dashboard.render.com
2. Click on your **Backend Service**
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add:
   - **Key:** `GOOGLE_SERVICE_ACCOUNT_JSON`
   - **Value:** Paste the entire JSON content from the file
6. Click **Save Changes**
7. **Redeploy** your service (or it will auto-redeploy)

### Step 3: Verify

After redeploying, check your Render logs. You should see:
- ✅ `📝 Using Google service account from environment variable`
- ✅ `✅ Google Auth configured from environment variable`
- ✅ `✅ Google Sheets client configured successfully!`

## Quick Copy-Paste (All-in-One)

**Key:** `GOOGLE_SERVICE_ACCOUNT_JSON`

**Value:** Open `backend/config/google-service-account.json` and copy the entire content (it's all on one line - that's correct!)

**OR** run this command to get it formatted:
```bash
cd backend
node utils/prepare-google-credentials.js
```

This will show you exactly what to copy and paste.

## Important: Share Google Sheet

**Before testing**, make sure your Google Sheet is shared with:
- **Email:** `project-dashboard-service@xenon-depth-477617-a9.iam.gserviceaccount.com`
- **Permission:** Editor

## That's It!

After adding the environment variable and redeploying, the error will be fixed! 🎉


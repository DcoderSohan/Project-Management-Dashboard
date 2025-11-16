# Google Sheets Service Account Setup Guide

## Problem
You're getting the error: "Google service account key file not found!"

This happens because the service account key file is not available in your deployment environment.

## Solution: Use Environment Variables (Recommended for Production)

For production deployments (like Render), you should use environment variables instead of a file.

### Step 1: Get Your Service Account Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **IAM & Admin** → **Service Accounts**
4. Click **Create Service Account**
5. Give it a name (e.g., "project-dashboard-service")
6. Click **Create and Continue**
7. Grant it the **Editor** role (or at least **Google Sheets API** access)
8. Click **Done**
9. Click on the service account you just created
10. Go to **Keys** tab
11. Click **Add Key** → **Create new key**
12. Choose **JSON** format
13. Download the JSON file

### Step 2: For Local Development

1. Place the downloaded JSON file at:
   ```
   backend/config/google-service-account.json
   ```
2. Make sure the file is named exactly: `google-service-account.json`
3. The file should NOT be committed to git (it's already in `.gitignore`)

### Step 3: For Production (Render)

1. Open the downloaded JSON file in a text editor
2. Copy the **entire JSON content** (all of it, from `{` to `}`)
3. Go to your Render backend service dashboard
4. Navigate to **Environment** section
5. Add a new environment variable:
   - **Key:** `GOOGLE_SERVICE_ACCOUNT_JSON`
   - **Value:** Paste the entire JSON content (as a single line or multi-line)
6. Save and redeploy your backend service

### Step 4: Share the Google Sheet with Service Account

1. Open your Google Sheet
2. Click the **Share** button
3. Add the service account email (found in the JSON file, looks like: `xxxxx@xxxxx.iam.gserviceaccount.com`)
4. Give it **Editor** permissions
5. Click **Send**

## Example Environment Variable

In Render, your `GOOGLE_SERVICE_ACCOUNT_JSON` should look like:

```json
{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

**Important:** 
- Paste the entire JSON as one line, or
- Use multi-line format if your platform supports it
- Make sure all quotes are properly escaped if needed

## Verification

After setting up, your backend should log:
- ✅ `Using Google service account from environment variable` (production)
- ✅ `Using Google service account from key file` (local)
- ✅ `Google Sheets client configured successfully!`

## Troubleshooting

### Still getting "key file not found"?
- ✅ Check that `GOOGLE_SERVICE_ACCOUNT_JSON` is set in Render
- ✅ Verify the JSON is valid (no syntax errors)
- ✅ Make sure the service account email has access to your Google Sheet

### Getting permission errors?
- ✅ Share the Google Sheet with the service account email
- ✅ Grant Editor permissions to the service account
- ✅ Enable Google Sheets API in Google Cloud Console

### Local development not working?
- ✅ Check file path: `backend/config/google-service-account.json`
- ✅ Verify file name is exactly: `google-service-account.json`
- ✅ Make sure the file contains valid JSON

## Security Notes

⚠️ **Never commit the service account key file to GitHub!**
- It's already in `.gitignore`
- Always use environment variables for production
- Keep your service account keys secure


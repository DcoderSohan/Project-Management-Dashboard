# Cloudinary Setup Instructions

## ✅ Code Review Complete

I've reviewed your entire codebase and confirmed that:
- ✅ Cloudinary packages are installed (`cloudinary` and `multer-storage-cloudinary`)
- ✅ Cloudinary is properly integrated in:
  - `backend/routes/uploadRoutes.js` (for document uploads)
  - `backend/routes/profileUploadRoutes.js` (for profile photos)
- ✅ Fallback to local storage is working correctly
- ✅ Environment variable loading is configured properly

## 🔧 What You Need to Do

### Step 1: Get Your Cloudinary Credentials

1. **Sign up for Cloudinary** (if you haven't already):
   - Go to: https://cloudinary.com/users/register/free
   - Free tier includes 25GB storage and 25GB bandwidth

2. **Get Your Credentials**:
   - After signing up, go to your Dashboard
   - You'll see three values:
     - **Cloud Name** (e.g., `dxyz1234`)
     - **API Key** (e.g., `123456789012345`)
     - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz`)

### Step 2: Update Your `.env` File

Open `backend/.env` and replace the placeholder values:

```env
# Replace these placeholder values:
CLOUDINARY_CLOUD_NAME=your_cloud_name_here        # ← Replace with your actual cloud name
CLOUDINARY_API_KEY=your_api_key_here              # ← Replace with your actual API key
CLOUDINARY_API_SECRET=your_api_secret_here       # ← Replace with your actual API secret
```

**Example:**
```env
CLOUDINARY_CLOUD_NAME=dxyz1234
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
```

### Step 3: For Render Deployment

If you're deploying to Render, add these environment variables in your Render dashboard:

1. Go to your Render backend service
2. Navigate to **Environment** section
3. Add these three variables:
   - `CLOUDINARY_CLOUD_NAME` = (your cloud name)
   - `CLOUDINARY_API_KEY` = (your API key)
   - `CLOUDINARY_API_SECRET` = (your API secret)
4. Save and redeploy

### Step 4: Verify Setup

1. **Restart your backend server**
2. Check the console logs - you should see:
   - ✅ `Cloudinary configured`
   - ✅ `Cloudinary storage configured successfully`
3. The warnings should disappear!

## 📋 Current .env File Structure

Your `.env` file should look like this:

```env
GOOGLE_SHEET_ID=1rru2UtYJjo9LzbzklaiwzzXzaTpmBssdhoaBZYolmn0

EMAIL_USER=sohansarang067@gmail.com
EMAIL_PASS=gxlyqwnflogiviby

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_actual_cloud_name_here
CLOUDINARY_API_KEY=your_actual_api_key_here
CLOUDINARY_API_SECRET=your_actual_api_secret_here
```

## 🔍 How Cloudinary is Used in Your Code

### 1. Document Uploads (`uploadRoutes.js`)
- **Files**: PDF, DOC, DOCX
- **Storage**: `project_dashboard` folder in Cloudinary
- **Fallback**: `backend/uploads/` (local storage)

### 2. Profile Photos (`profileUploadRoutes.js`)
- **Files**: JPG, PNG, GIF, WEBP
- **Storage**: `project_dashboard/profile_photos` folder in Cloudinary
- **Transformations**: Auto-resize to 400x400, face detection, auto quality
- **Fallback**: `backend/uploads/profile/` (local storage)

## ⚠️ Important Notes

1. **Never commit `.env` to GitHub** - It's already in `.gitignore`
2. **Keep API Secret private** - Don't share it publicly
3. **Free tier limits**:
   - 25 GB storage
   - 25 GB monthly bandwidth
   - Perfect for small to medium projects

## 🐛 Troubleshooting

### Still seeing warnings?
- ✅ Check spelling of variable names (must be exact)
- ✅ Restart server after adding credentials
- ✅ Verify credentials in Cloudinary dashboard
- ✅ For Render: Make sure variables are set in dashboard, not just `.env`

### Getting Cloudinary errors?
- Check your Cloudinary account is active
- Verify all three credentials are correct
- Check Cloudinary dashboard for account status
- Review backend console logs for specific error messages

## 📚 Additional Resources

- Cloudinary Documentation: https://cloudinary.com/documentation
- Cloudinary Dashboard: https://cloudinary.com/console
- Free Tier Details: https://cloudinary.com/pricing


# Where Admin Credentials Are Stored

## 1. Google Sheets (Primary Storage)
- **Sheet Name:** `AuthUsers`
- **Location:** Your Google Sheet (configured in `backend/config/googleSheetConfig.js`)
- **Columns:**
  - ID: `sohansarang067@gmail.com` (email used as ID)
  - Email: `sohansarang067@gmail.com`
  - Password: Hashed password (SHA256)
  - Role: `admin`
  - ProfilePhoto: (empty initially)
  - CreatedAt: Timestamp
  - UpdatedAt: Timestamp
  - IsActive: `true`

## 2. Backend Code (Email Reference Only)
- **File:** `backend/controllers/authController.js`
- **Line:** 16
- **Constant:**
  ```javascript
  const ADMIN_EMAIL = "sohansarang067@gmail.com";
  // Note: Password is NOT stored in code - it's set during signup and stored in Google Sheets
  ```

## 3. Frontend (No Storage)
- Credentials are **NOT** stored in frontend
- Only the authentication token is stored in `localStorage` after login
- Token is used for API requests

## How It Works

1. **Sign Up:** Admin creates account with email and password
   - Password is hashed using SHA256
   - Stored in Google Sheets "AuthUsers" sheet
   - Email is used as the user ID

2. **Login:** Admin enters email and password
   - Password is hashed and compared with stored hash in Google Sheets
   - If match, a session token is generated and stored in memory
   - Token is returned to frontend and stored in localStorage

3. **Authentication:** Token is verified on each API request
   - Token is checked against in-memory session storage
   - User data is retrieved from Google Sheets
   - Admin role is verified

## Security Notes

- Passwords are hashed before storage (SHA256)
- Tokens are stored in-memory on backend (expire after 24 hours)
- Admin email cannot be changed after creation
- Admin account cannot be deleted or deactivated
- Only admin can access the dashboard

## Changing Admin Password

To change the admin password:
1. Login as admin
2. Go to Profile page
3. Update password (new password will be hashed and stored in Google Sheets)

## Changing Admin Email

Admin email cannot be changed (it's fixed to `sohansarang067@gmail.com`).


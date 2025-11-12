# Password Reset Setup Guide

## Supabase Dashboard Configuration

To make the password reset flow work properly, you need to configure the redirect URLs in your Supabase dashboard:

### Steps:

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project: `qligxzesycdcchyznncw`

2. **Configure Authentication Settings**
   - Click on "Authentication" in the left sidebar
   - Go to "URL Configuration"

3. **Add Redirect URLs**
   Add the following URLs to the "Redirect URLs" section:

   **For Local Development:**
   ```
   http://localhost:8081/resetPassword
   http://localhost:19006/resetPassword
   http://127.0.0.1:8081/resetPassword
   ```

   **For Production (replace with your actual domain):**
   ```
   https://yourdomain.com/resetPassword
   ```

4. **Configure Email Templates (Optional)**
   - Go to "Authentication" → "Email Templates"
   - Select "Reset Password" template
   - Customize the email content if desired
   - Make sure the action link uses: `{{ .SiteURL }}/resetPassword`

5. **Save Changes**
   - Click "Save" to apply the configuration

## How the Password Reset Flow Works

### Step 1: User Requests Password Reset
1. User navigates to `/forgotPassword`
2. User enters their email address
3. App calls `supabase.auth.resetPasswordForEmail(email)`
4. Supabase sends an email with a magic link

### Step 2: User Clicks Magic Link
1. User receives email from Supabase
2. User clicks the password reset link in the email
3. Browser/App opens the link: `http://localhost:8081/resetPassword#access_token=...&refresh_token=...&type=recovery`
4. App extracts tokens from URL hash parameters

### Step 3: User Sets New Password
1. App verifies the tokens and creates a session
2. User enters new password
3. App calls `supabase.auth.updateUser({ password: newPassword })`
4. User is signed out and redirected to login page

## Testing the Flow

### Test Locally:

1. **Start the development server:**
   ```bash
   npx expo start --clear
   ```

2. **Open in web browser:**
   - Press `w` in the terminal to open in web
   - Or navigate to `http://localhost:8081`

3. **Test password reset:**
   - Go to login page
   - Click "Forgot Password?"
   - Enter a valid email address (an account that exists in your database)
   - Check the email inbox for the reset link
   - Click the link (it should open `/resetPassword` with tokens in URL)
   - Enter new password
   - Confirm successful reset and redirect to login
   - Login with the new password

### Troubleshooting:

**Error: "Invalid or expired reset link"**
- **Cause:** Redirect URL not configured in Supabase dashboard
- **Solution:** Add your app's URL to the redirect URLs in Supabase settings

**Error: "No account found with this email"**
- **Cause:** The email doesn't exist in your database
- **Solution:** Make sure you're using an email from an existing account

**Email not received:**
- Check spam folder
- Verify email settings in Supabase dashboard
- Check Supabase logs for email sending errors
- Make sure SMTP is properly configured (default uses Supabase's built-in email)

**Link redirects to wrong URL:**
- Update the `redirectTo` parameter in `forgotPassword/index.jsx`
- Make sure it matches the URL in Supabase dashboard

## Implementation Details

### Files Modified:

1. **`app/login/index.jsx`**
   - Added "Forgot Password?" link

2. **`app/forgotPassword/index.jsx`**
   - Email input and send reset link functionality
   - Calls `supabase.auth.resetPasswordForEmail()`

3. **`app/resetPassword/index.jsx`**
   - Handles magic link tokens from URL
   - Password update form
   - Calls `supabase.auth.updateUser({ password })`

4. **`utils/supabase.js`**
   - Enabled `detectSessionInUrl: true` for web platforms
   - Allows automatic token extraction from URL

### Security Features:

- ✅ Magic links expire after 1 hour (Supabase default)
- ✅ Tokens are single-use
- ✅ Password validation (minimum 6 characters)
- ✅ Password confirmation required
- ✅ User is signed out after password change
- ✅ Proper error handling and user feedback

## Production Deployment

When deploying to production:

1. Update redirect URLs in Supabase dashboard with production domain
2. Update `redirectTo` in `forgotPassword/index.jsx`:
   ```javascript
   const redirectUrl = Platform.OS === 'web'
     ? `https://yourdomain.com/resetPassword`
     : 'framez://resetPassword';
   ```
3. Configure custom SMTP for professional email sending (optional)
4. Customize email templates with your branding

## Notes

- The magic link approach is more secure than 6-digit codes
- Users don't need to remember or type codes
- Links automatically expire
- Works seamlessly across devices (user can reset password on different device than where they requested it)

# Forgot Password Flow Documentation

## Overview
Complete password reset functionality integrated with Supabase authentication using a two-step verification process.

## Implementation Details

### Files Modified/Created

1. **`app/login/index.jsx`**
   - Added "Forgot Password?" link below the Sign In button
   - Link navigates to `/forgotPassword` route
   - Styled to match existing design (blue link color)

2. **`app/forgotPassword/index.jsx`** (NEW)
   - Two-step password reset flow
   - Step 1: Enter email and send verification code
   - Step 2: Enter OTP and new password
   - Complete form validation and error handling

### User Flow

#### Step 1: Request Password Reset
1. User clicks "Forgot Password?" link on login page
2. User enters their email address
3. System validates email format
4. System sends verification code via Supabase Auth
5. Success message displayed: "If an account exists with this email, you will receive a verification code"
6. Automatically advances to Step 2 after 2 seconds

#### Step 2: Verify and Reset
1. User enters 6-digit verification code from email
2. User enters new password (min 6 characters)
3. User confirms new password
4. System validates:
   - OTP is 6 digits
   - Password is at least 6 characters
   - Passwords match
5. System verifies OTP with Supabase
6. System updates password
7. System signs user out
8. Success message displayed: "Password reset successful!"
9. Redirects to login page after 2 seconds

### Technical Implementation

#### Supabase Integration

**Send Verification Code:**
```javascript
const { error } = await supabase.auth.resetPasswordForEmail(
  email.toLowerCase(),
  {
    redirectTo: Platform.OS === 'web'
      ? `${window.location.origin}/forgotPassword`
      : 'framez://forgotPassword',
  }
);
```

**Verify OTP and Update Password:**
```javascript
// Step 1: Verify OTP
const { error: verifyError } = await supabase.auth.verifyOtp({
  email: email.toLowerCase(),
  token: otp,
  type: 'recovery',
});

// Step 2: Update password
const { error: updateError } = await supabase.auth.updateUser({
  password: newPassword,
});

// Step 3: Sign out
await supabase.auth.signOut();
```

### Features

✅ **Two-Step Verification**
- Email validation before sending OTP
- 6-digit OTP verification
- Secure password update flow

✅ **Form Validation**
- Email format validation
- Password length validation (min 6 characters)
- Password confirmation matching
- OTP format validation (6 digits)

✅ **Error Handling**
- Invalid email format
- Email not found (security-conscious messaging)
- Invalid or expired OTP
- Password update failures
- Network errors

✅ **User Experience**
- Loading states with ActivityIndicator
- Clear error and success messages
- No alert popups (inline messages only)
- Back button to return to login
- Resend code option
- Show/hide password toggles
- Automatic progression between steps

✅ **Security**
- Security-conscious error messages (doesn't reveal if email exists)
- OTP expiration handling
- Automatic sign-out after password reset
- Secure password storage via Supabase Auth

✅ **Design Consistency**
- Matches existing app design (black background, blue accents)
- Consistent input styling
- Consistent button styling
- Responsive layout with KeyboardAvoidingView

### UI Components

**Step 1 UI:**
- Back button (top left)
- "Reset Password" title
- Descriptive subtitle
- Email input field
- "Send Verification Code" button
- "Remember your password? Sign In" link

**Step 2 UI:**
- Back button (top left)
- "Reset Password" title
- Updated subtitle for code entry
- Verification code input (6 digits, number pad)
- New password input with show/hide toggle
- Confirm password input with show/hide toggle
- "Reset Password" button
- "Didn't receive code? Resend" link
- "Remember your password? Sign In" link

### Error Messages

| Error | Message |
|-------|---------|
| Empty email | "Please enter your email address." |
| Invalid email format | "Please enter a valid email address." |
| Send OTP failure | "Unable to send verification code. Please try again." |
| Empty OTP | "Please enter the verification code." |
| Invalid OTP length | "Verification code must be 6 digits." |
| Invalid/expired OTP | "Invalid or expired verification code." |
| Empty password | "Please enter a new password." |
| Short password | "Password must be at least 6 characters." |
| Password mismatch | "Passwords do not match." |
| Update failure | "Unable to update password. Please try again." |
| Network error | "An unexpected error occurred. Please try again." |

### Success Messages

| Action | Message |
|--------|---------|
| OTP sent | "If an account exists with this email, you will receive a verification code." |
| Password reset | "Password reset successful! Redirecting to login..." |

## Testing Checklist

### Manual Testing Steps

#### Test Case 1: Complete Happy Path
- [ ] Navigate to login page
- [ ] Click "Forgot Password?" link
- [ ] Enter valid email from existing account
- [ ] Click "Send Verification Code"
- [ ] Verify success message appears
- [ ] Check email inbox for verification code
- [ ] Wait for auto-advance to Step 2 (2 seconds)
- [ ] Enter 6-digit code from email
- [ ] Enter new password (min 6 chars)
- [ ] Enter matching confirm password
- [ ] Click "Reset Password"
- [ ] Verify success message appears
- [ ] Verify redirect to login page (2 seconds)
- [ ] Log in with email and NEW password
- [ ] Verify login successful

#### Test Case 2: Email Validation
- [ ] Leave email empty, click send → Error: "Please enter your email address."
- [ ] Enter invalid email (e.g., "test"), click send → Error: "Please enter a valid email address."
- [ ] Enter email without @ (e.g., "test.com"), click send → Error: "Please enter a valid email address."

#### Test Case 3: OTP Validation
- [ ] Complete Step 1, advance to Step 2
- [ ] Leave OTP empty, click reset → Error: "Please enter the verification code."
- [ ] Enter 5-digit code → Error: "Verification code must be 6 digits."
- [ ] Enter wrong 6-digit code → Error: "Invalid or expired verification code."
- [ ] Wait for OTP to expire (usually 60 minutes), try old code → Error: "Invalid or expired verification code."

#### Test Case 4: Password Validation
- [ ] Complete Step 1, advance to Step 2
- [ ] Enter valid OTP
- [ ] Leave password empty → Error: "Please enter a new password."
- [ ] Enter password < 6 chars (e.g., "12345") → Error: "Password must be at least 6 characters."
- [ ] Enter password and different confirm password → Error: "Passwords do not match."

#### Test Case 5: Resend Code
- [ ] Complete Step 1, advance to Step 2
- [ ] Click "Didn't receive code? Resend"
- [ ] Verify returns to Step 1
- [ ] Verify email field still has value
- [ ] Click send again
- [ ] Verify new code sent

#### Test Case 6: Back Button Navigation
- [ ] From Step 1, click back button → Returns to login
- [ ] From Step 2, click back button → Returns to login

#### Test Case 7: Show/Hide Password
- [ ] In Step 2, click eye icon on "New Password" field
- [ ] Verify password becomes visible
- [ ] Click again, verify password hidden
- [ ] Repeat for "Confirm New Password" field

#### Test Case 8: Loading States
- [ ] Click "Send Verification Code" → Button shows loading spinner
- [ ] Click "Reset Password" → Button shows loading spinner
- [ ] Verify buttons are disabled during loading

#### Test Case 9: Message Clearing
- [ ] Trigger an error message
- [ ] Start typing in any input field
- [ ] Verify error message clears

#### Test Case 10: Sign Out After Reset
- [ ] Complete full reset flow
- [ ] Verify user is not automatically signed in
- [ ] Verify must use new password to sign in

## Known Limitations

1. **Email Existence:** For security, the system doesn't explicitly confirm if an email exists (prevents email enumeration attacks)
2. **OTP Expiration:** OTP codes typically expire after 60 minutes (Supabase default)
3. **Rate Limiting:** Supabase may rate-limit password reset requests (prevents abuse)
4. **Email Delivery:** Depends on Supabase email service and user's email provider

## Future Enhancements

1. **Rate Limiting UI:** Show countdown timer if user sends too many requests
2. **OTP Auto-fill:** Support SMS auto-fill on mobile devices
3. **Password Strength Meter:** Visual indicator of password strength
4. **Recent Password Check:** Prevent reuse of old passwords
5. **Multi-factor Authentication:** Optional 2FA setup
6. **Biometric Reset:** Face ID / Touch ID for password reset on mobile

## Troubleshooting

### Issue: Not receiving verification code email
**Solutions:**
- Check spam/junk folder
- Verify email address is correct
- Check Supabase email settings in dashboard
- Verify SMTP configuration if using custom email

### Issue: "Invalid or expired verification code"
**Solutions:**
- Request new code (OTP may have expired)
- Verify you're entering all 6 digits
- Check for typos in the code
- Ensure using most recent code if multiple were sent

### Issue: "Unable to update password"
**Solutions:**
- Check Supabase service status
- Verify auth is properly configured
- Check browser console for detailed errors
- Try again after a few moments

## Security Considerations

1. ✅ No password hints or old password display
2. ✅ Security-conscious error messages (doesn't leak user existence)
3. ✅ OTP-based verification (not just email link)
4. ✅ Automatic sign-out after password change
5. ✅ Password must meet minimum requirements
6. ✅ Rate limiting via Supabase
7. ✅ Secure password storage via Supabase Auth
8. ✅ No password transmitted in URLs or logs

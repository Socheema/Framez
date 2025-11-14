# Production Error Fixes - Deployment Checklist

## 🔴 CRITICAL: Database Migration Required

This must be done FIRST before deploying the app update.

### Step 1: Database Migration (Run in Supabase SQL Editor)

1. **Go to Supabase Dashboard**
   - URL: https://app.supabase.com
   - Select your Framez project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy SQL from file**
   - Open file: `DATABASE_MIGRATION_FIX_PRODUCTION_ERRORS.sql`
   - Copy all SQL content

4. **Paste and Execute**
   - Paste into Supabase SQL Editor
   - Click "Run" button
   - Wait for "Success!" message
   - Should complete in <1 second

5. **Verify Column Was Added**
   - Run this verification query:
   ```sql
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = 'messages' AND column_name = 'read_status';
   ```
   - Expected result: One row showing `read_status | boolean | YES | false`

✅ **Database migration complete**

---

## 🟢 Code Changes - Already Applied

The following code fixes have already been committed:

- [x] **ERROR 1 Fix**: `stores/postStore.js` - Duplicate post detection
- [x] **ERROR 2 Fix**: `stores/messageStore.js` - Duplicate message send prevention
- [x] **ERROR 3 Fix**: `app/tabs/profile.jsx` - Avatar upload Base64 fix

All code changes are backward compatible and don't require any additional configuration.

---

## 📋 Testing Checklist

### Before Deployment
- [ ] Database migration SQL executed successfully
- [ ] Verification query shows `read_status` column exists
- [ ] All code changes committed
- [ ] No new console errors in dev build

### After Deployment to Staging
- [ ] Build development version: `npm start`
- [ ] Test in Chrome simulator
  - [ ] Create post - no duplicate key error
  - [ ] Send message - no errors
  - [ ] Change avatar - uploads successfully

### Production Testing (Expo Go)
1. **Download Expo Go**
   - iOS: App Store
   - Android: Google Play Store

2. **Connect to development server**
   ```bash
   npx expo start
   ```
   - Scan QR code with Expo Go
   - Wait for app to load

3. **Test ERROR 1 Fix: Duplicate Posts**
   - Go to Create screen
   - Create a post
   - ✅ Check: No "Encountered two children with the same key" error
   - ✅ Check: Post appears once in feed (not duplicated)
   - ✅ Check: LogBox is clear

4. **Test ERROR 2 Fix: Messages**
   - Go to any user's profile
   - Click to message them
   - Send a test message
   - ✅ Check: No "column messages.read_status does not exist" error
   - ✅ Check: Message appears exactly once (not twice)
   - Send multiple messages rapidly
   - ✅ Check: All messages send exactly once each

5. **Test ERROR 3 Fix: Avatar Upload**
   - Go to your profile
   - Click avatar to change
   - Select image from phone gallery
   - ✅ Check: No "Cannot read property 'Base64' of undefined" error
   - ✅ Check: Avatar uploads and displays successfully

### Production APK Testing
1. **Build APK**
   ```bash
   eas build -p android --profile production
   ```

2. **Download and Install APK**
   - Wait for build to complete (~15 minutes)
   - Download APK file
   - Install on test Android device

3. **Repeat all tests from Expo Go section**
   - Create posts
   - Send messages
   - Change avatar
   - ✅ All should work without errors

### Regression Testing
- [ ] Feed scrolling smooth
- [ ] Like/unlike functionality works
- [ ] Comments work
- [ ] Navigation works
- [ ] No unexpected crashes
- [ ] Console is clean of errors

---

## 📊 Error Tracking

### ERROR 1: Duplicate Key (FIXED)
```
Error: "Encountered two children with the same key: $230ad993-16ad-4d85-8d7c-7c3fe1f5c284"
Location: LogBox/Data/LogBoxData.js
Fix: postStore.js - Added duplicate detection
Status: ✅ FIXED
```

### ERROR 2: Database Column Missing (FIXED)
```
Error: "column messages.read_status does not exist"
Code: 42703
Fix: 
  1. Database migration SQL
  2. messageStore.js - Added isSending guard
Status: ✅ FIXED (after DB migration)
```

### ERROR 3: Avatar Upload Base64 (FIXED)
```
Error: "Cannot read property 'Base64' of undefined"
Location: uploadAvatar in profile.jsx
Fix: Changed to 'base64' string literal + fallback
Status: ✅ FIXED
```

---

## 🚀 Deployment Timeline

| Step | Action | Time | Status |
|------|--------|------|--------|
| 1 | Run database migration SQL | 5 min | ⏳ TO DO |
| 2 | Test in Chrome simulator | 10 min | ⏳ TO DO |
| 3 | Test in Expo Go | 15 min | ⏳ TO DO |
| 4 | Build production APK | 20 min | ⏳ TO DO |
| 5 | Test on real Android device | 15 min | ⏳ TO DO |
| 6 | Deploy to production | - | ⏳ TO DO |

**Total estimated time: ~65 minutes**

---

## 🆘 Troubleshooting

### Database Migration Failed
- [ ] Check SQL syntax (copy from file, don't edit)
- [ ] Ensure you have database write permissions
- [ ] Check Supabase logs for error details
- [ ] Try running simpler query first to verify connection

### Still seeing duplicate key error
- [ ] Clear app cache
- [ ] Rebuild app completely
- [ ] Verify postStore.js has duplicate detection code
- [ ] Check console logs for warnings

### Still seeing messages column error
- [ ] Verify database migration ran successfully
- [ ] Run verification SQL query to confirm column exists
- [ ] Check Supabase logs
- [ ] May need to wait a few minutes for replication

### Still seeing Base64 error
- [ ] Clear app cache
- [ ] Rebuild app
- [ ] Check that profile.jsx has 'base64' string literal (not EncodingType)
- [ ] Verify decode import is present

---

## 📞 Support

If you encounter issues:
1. Check console logs for exact error messages
2. Take screenshots of errors
3. Note which build (dev/staging/production) shows error
4. Check Supabase logs for backend errors
5. Review troubleshooting section above

---

## ✅ Final Sign-Off

- [ ] Database migration verified
- [ ] All testing passed
- [ ] No regressions detected
- [ ] Ready for production deployment

Date completed: _______________
Deployed by: _______________

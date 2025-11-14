# Production Error Fixes - Framez App

## Overview
Fixed three critical production errors that occurred in Expo Go and production APK but not in Chrome simulator:
1. React duplicate key error when creating posts
2. Database column missing error when sending messages  
3. Avatar upload Base64 undefined error

---

## ERROR 1: React Duplicate Key Error (LogBox Error)

### Symptoms
- Error message: "Encountered two children with the same key"
- Key: `$230ad993-16ad-4d85-8d7c-7c3fe1f5c284`
- Occurs when creating a post
- Location: LogBox/Data/LogBoxData.js
- Only happens in Expo Go and production APK

### Root Cause
1. **Post Store Issue**: `addPost()` function in `stores/postStore.js` was not checking for duplicate posts
   - When the same post was added twice, it would create duplicate keys in the FlatList
   - This typically happened due to rapid submissions or refetch cycles

2. **Possible Sources**:
   - Form submitted twice before state updated
   - Post refetch happening immediately after creation
   - Race condition between local state update and Supabase response

### Fix Applied
**File: `stores/postStore.js`** - Added duplicate detection in `addPost()`

```javascript
addPost: (post) => set((state) => {
  // Prevent duplicate posts with same ID
  const isDuplicate = state.posts.some(p => p && p.id === post.id);
  if (isDuplicate) {
    console.warn('[PostStore] Duplicate post detected, skipping:', post.id);
    return state;
  }
  return {
    posts: [post, ...state.posts],
    error: null
  };
}),
```

**What changed:**
- Before adding a post, check if a post with the same ID already exists
- If duplicate found, skip adding and log warning
- This prevents React FlatList from rendering duplicate keys

**Why this fixes it:**
- Even if `addPost()` is called multiple times with the same post ID, only one instance will be added
- React FlatList will have unique keys for all items
- The warning helps developers identify where duplicate calls are happening

---

## ERROR 2: Database Column Missing - Messages

### Symptoms
- Error message: "Failed after 4 attempts"
- Error code: 42703 (PostgreSQL undefined column error)
- Error detail: "column messages.read_status does not exist"
- Occurs when sending messages
- Messages send TWICE simultaneously (duplicate sends)
- Only happens in production, not in Chrome simulator

### Root Cause
1. **Database Schema Mismatch**: Production database may not have the `read_status` column
   - The schema file (`MESSAGING_SYSTEM_SCHEMA.sql`) defines this column
   - But it may not have been run in production Supabase database
   - Application code references this column in multiple places

2. **Duplicate Message Sends**: No guard against concurrent message sends
   - User could rapidly click Send button
   - Multiple `sendMessage()` calls would execute simultaneously
   - All would succeed, creating duplicate messages in database
   - When first call fails with column error, retry logic kicks in
   - But guard wasn't preventing the duplicate call

### Fixes Applied

#### Fix 2A: Add Missing Database Column
**File: `DATABASE_MIGRATION_FIX_PRODUCTION_ERRORS.sql`** - Database migration

```sql
-- Add missing read_status column if it doesn't exist
ALTER TABLE IF EXISTS messages 
ADD COLUMN IF NOT EXISTS read_status BOOLEAN DEFAULT FALSE;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_messages_read_status 
ON messages(read_status) 
WHERE read_status = FALSE;
```

**Steps to deploy:**
1. Go to Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the SQL from `DATABASE_MIGRATION_FIX_PRODUCTION_ERRORS.sql`
4. Run it
5. Redeploy the app

#### Fix 2B: Prevent Duplicate Message Sends
**File: `stores/messageStore.js`** - Added `isSending` state guard

Added new state:
```javascript
// State
isSending: false,  // NEW: Track if message is being sent
```

Updated `sendMessage()` function:
```javascript
sendMessage: async (conversationId, senderId, text) => {
  // Guard: prevent concurrent sends
  const { isSending } = get();
  if (isSending) {
    console.warn('[MessageStore] Already sending a message, ignoring duplicate call');
    return null;
  }

  if (!text || !text.trim()) {
    console.warn('[MessageStore] Empty message text, ignoring');
    return null;
  }

  set({ isSending: true, error: null });

  try {
    const message = await sendMessageService(conversationId, senderId, text);
    // ... rest of logic
  } catch (error) {
    console.error('[MessageStore] Error sending message:', error);
    set({ error: error.message });
    return null;
  } finally {
    set({ isSending: false });
  }
},
```

**What changed:**
- Added `isSending` state to track if message sending is in progress
- At start of `sendMessage()`, check if `isSending` is true
- If true, log warning and return null immediately (prevent concurrent call)
- Set `isSending: true` before sending
- Set `isSending: false` in finally block (always runs after try/catch)
- Used try/finally pattern to ensure flag is reset even on error

**Why this fixes it:**
- First call to `sendMessage()` sets `isSending: true`
- Any concurrent calls find `isSending: true` and return immediately
- After first call completes (success or error), `isSending: false` is set
- Now rapid clicks only result in one actual send

---

## ERROR 3: Avatar Upload Base64 Undefined Error

### Symptoms
- Error message: "Error uploading avatar: TypeError: Cannot read property 'Base64' of undefined"
- Occurs when changing avatar on profile page
- Location: `uploadAvatar` function in `app/tabs/profile.jsx`
- Only happens in production APK and Expo Go, not Chrome simulator

### Root Cause
`FileSystem.EncodingType.Base64` is undefined in production builds

**Why this happens:**
- In development, the constant may be defined through tree-shaking or bundler configuration
- In production build, the constant might be undefined due to different bundling
- This is a common issue with Expo FileSystem across different build environments
- The safer approach is using the string literal `'base64'` directly

### Fix Applied
**File: `app/tabs/profile.jsx`** - Changed encoding type and added fallback

```javascript
} else {
  // For native: use FileSystem + base64-arraybuffer
  // Use 'base64' string literal instead of FileSystem.EncodingType.Base64
  // which may be undefined in production builds
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',  // Changed from: FileSystem.EncodingType.Base64
    });
    uploadData = decode(base64);
  } catch (fileError) {
    console.error('FileSystem read error, falling back to fetch blob:', fileError);
    // Fallback to fetch if FileSystem fails
    const response = await fetch(imageUri);
    uploadData = await response.blob();
  }
}
```

**What changed:**
1. Replaced `FileSystem.EncodingType.Base64` with string literal `'base64'`
2. Added try-catch around FileSystem.readAsStringAsync
3. Added fallback: if FileSystem fails, use fetch to get blob instead
4. Blob can be uploaded directly to Supabase Storage

**Why this fixes it:**
- String literal `'base64'` is always defined (it's just a string)
- Works across all build environments (dev and production)
- Fallback ensures avatar upload can succeed even if FileSystem fails
- More robust error handling with meaningful error messages

---

## Summary of Changes

### Files Modified

| File | Change | Reason |
|------|--------|--------|
| `stores/postStore.js` | Added duplicate detection in `addPost()` | Fix ERROR 1: Duplicate post keys |
| `stores/messageStore.js` | Added `isSending` state and guard in `sendMessage()` | Fix ERROR 2: Duplicate message sends |
| `app/tabs/profile.jsx` | Changed encoding to `'base64'` string and added fallback | Fix ERROR 3: Base64 undefined error |
| `DATABASE_MIGRATION_FIX_PRODUCTION_ERRORS.sql` | New file with SQL to add `read_status` column | Fix ERROR 2: Database schema mismatch |

### Breaking Changes
None! All changes are backward compatible and don't affect existing functionality.

---

## Deployment Steps

### Step 1: Update Database Schema (CRITICAL)
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your Framez project
3. Go to SQL Editor
4. Open file: `DATABASE_MIGRATION_FIX_PRODUCTION_ERRORS.sql`
5. Copy all SQL and paste into Supabase SQL Editor
6. Click "Run" button
7. Wait for completion (should take <1 second)
8. Verify: Run the verification query at the bottom of the SQL file

### Step 2: Deploy App Update
1. Commit code changes:
   ```bash
   git add stores/postStore.js stores/messageStore.js app/tabs/profile.jsx
   git commit -m "fix(production): Fix duplicate key, messages column, and avatar upload errors"
   git push origin main
   ```

2. Build and deploy:
   - For Expo Go testing: `npx expo start`
   - For production APK: `eas build -p android --profile production`
   - For iOS: `eas build -p ios --profile production`

### Step 3: Test on Production
- [ ] Test on Expo Go
- [ ] Test on production Android APK
- [ ] Create a post - should not show duplicate key error
- [ ] Send a message - should not show database column error or send twice
- [ ] Change avatar - should upload without Base64 error
- [ ] Check console - should not show any errors related to these three issues

---

## Testing Checklist

### ERROR 1 - Duplicate Key Fix
- [ ] Create multiple posts in succession
- [ ] No "Encountered two children with the same key" error
- [ ] No duplicate posts appearing in feed
- [ ] LogBox is clear

### ERROR 2 - Messages Database & Duplicate Sends
- [ ] Run database migration SQL first
- [ ] Send a message
- [ ] No "column messages.read_status does not exist" error
- [ ] Message appears exactly once (not twice)
- [ ] Send multiple messages rapidly
- [ ] All messages send exactly once each
- [ ] No error messages in console
- [ ] Messages marked as read work correctly

### ERROR 3 - Avatar Upload Base64
- [ ] Go to profile page
- [ ] Click avatar to change it
- [ ] Select an image from gallery
- [ ] No "Cannot read property 'Base64' of undefined" error
- [ ] Avatar uploads successfully
- [ ] New avatar displays on profile
- [ ] Works on both development and production builds

### Regression Testing
- [ ] Feed still scrolls smoothly
- [ ] Like/unlike still works
- [ ] Posts create successfully
- [ ] Comments work
- [ ] Messaging functionality works
- [ ] All navigation works
- [ ] No new console errors

---

## Console Logging Added

New console logs for debugging:

```javascript
// Post Store
console.warn('[PostStore] Duplicate post detected, skipping:', post.id);

// Message Store
console.warn('[MessageStore] Already sending a message, ignoring duplicate call');
console.warn('[MessageStore] Empty message text, ignoring');
console.error('[MessageStore] Error sending message:', error);

// Profile - Avatar Upload
console.error('FileSystem read error, falling back to fetch blob:', fileError);
```

These help identify if issues are still occurring in production.

---

## FAQ

**Q: Will this break anything?**
A: No. All changes are defensive and backward compatible. No API changes, no behavior changes for working features.

**Q: Do I need to update the Supabase schema?**
A: Yes, this is critical! Run the SQL migration file first before deploying the app update.

**Q: Will existing messages/posts/avatars be affected?**
A: No. The database migration only adds the missing column with default value. Existing data is preserved.

**Q: Why don't these errors show in Chrome simulator?**
A: Chrome simulator uses web APIs that differ from native Expo APIs. FileSystem.EncodingType may be tree-shaken in production but available in dev. Database queries execute differently in Chrome vs native.

**Q: Can I test this without Expo Go?**
A: Yes, but Expo Go is the best way to test native behavior. Chrome simulator won't reproduce these issues.

**Q: What if I still see errors after deploying?**
A: 
1. Check Supabase logs for errors
2. Check app console for error messages
3. Verify database migration ran successfully
4. Try clearing app cache and rebuilding
5. Contact support with full error logs

---

## Success Indicators

You'll know these fixes are working when:
1. ✅ No duplicate key errors in production
2. ✅ Messages send exactly once
3. ✅ Avatars upload successfully
4. ✅ No Base64 undefined errors
5. ✅ No database column missing errors
6. ✅ All existing features work normally
7. ✅ Console is clean of related errors

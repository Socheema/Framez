# 🔧 Fix Follow Button Issue - Complete Guide

## Problem Summary

**Symptom**: Follow button changes to "Following" then immediately reverts back to "Follow"

**Root Cause**: Supabase Row-Level Security (RLS) policies are **blocking** the database operations

**Error Code**: `42501` - "new row violates row-level security policy for table 'follows'"

---

## ⚠️ Critical Issue: Missing RLS Policies

Your `follows` table has RLS **enabled** but has **NO policies** configured. This means:

- ❌ All INSERT operations are blocked → Cannot follow users
- ❌ All DELETE operations are blocked → Cannot unfollow users
- ❌ All SELECT operations are blocked → Cannot check follow status

**Result**: The optimistic UI update shows "Following" immediately (client-side), but when the database operation fails (403 Forbidden), the code automatically rolls back the change, making it look like nothing happened.

---

## 🎯 Solution: Apply RLS Policies to Supabase

You need to run SQL commands in your Supabase dashboard to add the missing policies.

### Step 1: Open Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project: `qligxzesycdcchyznncw`
3. Click **"SQL Editor"** in the left sidebar
4. Click **"+ New query"** button

### Step 2: Copy and Paste This SQL

```sql
-- ============================================
-- FOLLOW FEATURE: Row-Level Security Policies
-- ============================================

-- 1. Enable RLS (if not already enabled)
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read all follows" ON follows;
DROP POLICY IF EXISTS "Users can insert follows as follower" ON follows;
DROP POLICY IF EXISTS "Users can delete their own follow relationships" ON follows;

-- 3. CREATE POLICY: Allow all authenticated users to VIEW follows
-- This is needed for displaying follower/following counts
CREATE POLICY "Users can read all follows"
ON follows
FOR SELECT
TO authenticated
USING (true);

-- 4. CREATE POLICY: Allow users to FOLLOW others (as themselves)
-- Users can only create follows where they are the follower
-- This prevents users from creating follows on behalf of others
CREATE POLICY "Users can insert follows as follower"
ON follows
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

-- 5. CREATE POLICY: Allow users to UNFOLLOW (delete their own follows)
-- Users can only delete follows where they are the follower
CREATE POLICY "Users can delete their own follow relationships"
ON follows
FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);

-- ============================================
-- Verification: Check that policies exist
-- ============================================
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'follows';
```

### Step 3: Execute the SQL

1. **Click "Run"** or press **`Ctrl + Enter`**
2. You should see: **"Success. No rows returned"** for the policy creation
3. The verification query at the end should show **3 policies**:
   - `Users can read all follows`
   - `Users can insert follows as follower`
   - `Users can delete their own follow relationships`

### Step 4: Verify Policies Are Active

Run this verification query separately:

```sql
-- This should return 3 rows (one for each policy)
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'follows';
```

**Expected Output**:
```
policyname                                      | cmd
------------------------------------------------+--------
Users can read all follows                      | SELECT
Users can insert follows as follower            | INSERT
Users can delete their own follow relationships | DELETE
```

---

## 🧪 Testing After Fix

Once you've applied the SQL policies:

### 1. Refresh Your App

```bash
# Clear the cache and restart
npx expo start -c
```

### 2. Test Follow Functionality

**Test 1: Follow a User**
- ✅ Navigate to another user's profile
- ✅ Click "Follow" button
- ✅ Button should change to "Following" **and stay that way**
- ✅ Follower count should increase by 1 **and stay increased**
- ✅ No console errors

**Test 2: Unfollow a User**
- ✅ Click "Following" button
- ✅ Button should change back to "Follow"
- ✅ Follower count should decrease by 1
- ✅ No console errors

**Test 3: Check Real-time Updates**
- ✅ Open the same profile on another device/browser
- ✅ Follow from one device
- ✅ Count should update on the other device within 1-2 seconds

**Test 4: Duplicate Prevention**
- ✅ Follow a user
- ✅ Try to follow them again (by refreshing and clicking again)
- ✅ Should handle gracefully (no errors, button stays "Following")

---

## 🎨 Expected Behavior After Fix

### ✅ Following Flow
```
User clicks "Follow"
    ↓
Button immediately changes to "Following" (optimistic update)
    ↓
Request sent to Supabase: INSERT into follows
    ↓
RLS Policy: Check if auth.uid() = follower_id ✅
    ↓
Insert succeeds
    ↓
Button stays "Following" ✅
Follower count stays increased ✅
```

### ✅ Unfollowing Flow
```
User clicks "Following"
    ↓
Button immediately changes to "Follow" (optimistic update)
    ↓
Request sent to Supabase: DELETE from follows
    ↓
RLS Policy: Check if auth.uid() = follower_id ✅
    ↓
Delete succeeds
    ↓
Button stays "Follow" ✅
Follower count stays decreased ✅
```

---

## 🔍 Understanding the Errors

### Error 1: HTTP 403 Forbidden
```
POST https://qligxzesycdcchyznncw.supabase.co/rest/v1/follows?select=* 403 (Forbidden)
```

**Cause**: Supabase RLS is blocking the INSERT operation because no policy allows it.

**Fix**: Apply the INSERT policy shown above.

### Error 2: RLS Policy Violation (42501)
```
new row violates row-level security policy for table "follows"
```

**Cause**: RLS is enabled but no policies exist that allow the operation.

**Fix**: Apply the three policies (SELECT, INSERT, DELETE) shown above.

### Error 3: Unexpected text node in View
```
Unexpected text node: . A text node cannot be a child of a <View>
```

**Cause**: This is likely a React Native render error that occurs when data is undefined/null.

**Fix**: This should disappear once the RLS policies are fixed and data loads correctly.

---

## 🔒 Security Explained

### Policy 1: SELECT (Read All Follows)
```sql
USING (true)
```
- Allows all authenticated users to **view** follow relationships
- Needed for displaying follower/following counts
- Safe because follow relationships are public information

### Policy 2: INSERT (Create Follow)
```sql
WITH CHECK (auth.uid() = follower_id)
```
- Users can only create follows where **they are the follower**
- Prevents impersonation: User A cannot create a follow "from" User B
- Ensures only authenticated users can follow

### Policy 3: DELETE (Remove Follow)
```sql
USING (auth.uid() = follower_id)
```
- Users can only delete follows where **they are the follower**
- Prevents sabotage: User A cannot delete User B's follows
- Ensures users can only unfollow themselves

---

## 📊 What These Policies Allow

| Action | Who Can Do It | What's Protected |
|--------|---------------|------------------|
| **View** all follows | Any authenticated user | Read-only, safe to share |
| **Create** a follow | Only the follower themselves | Can't follow AS someone else |
| **Delete** a follow | Only the follower themselves | Can't delete other's follows |

---

## 🚫 What These Policies Prevent

- ❌ Unauthenticated users cannot follow/unfollow
- ❌ User A cannot create follows "from" User B (impersonation)
- ❌ User A cannot delete User B's follows (sabotage)
- ❌ Anonymous users cannot see follow relationships

---

## ✅ Checklist

Before testing:
- [ ] Opened Supabase Dashboard
- [ ] Navigated to SQL Editor
- [ ] Ran the policy creation SQL
- [ ] Verified 3 policies exist (SELECT, INSERT, DELETE)
- [ ] Refreshed the React Native app

After testing:
- [ ] Follow button changes to "Following" and stays
- [ ] Follower count increases and stays increased
- [ ] Unfollow button changes to "Follow" and stays
- [ ] Follower count decreases correctly
- [ ] No 403 errors in console
- [ ] No RLS policy errors in console
- [ ] Real-time updates work across devices

---

## 🆘 Troubleshooting

### Still Getting 403 Error?

**Check if you're authenticated:**
```sql
SELECT auth.uid(); -- Should return your user ID, not NULL
```

If it returns NULL, you're not logged in. Log out and log back in.

### Still Getting RLS Error?

**Verify policies exist:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'follows';
```

Should show 3 policies. If not, re-run the policy creation SQL.

### Policies Exist But Still Not Working?

**Check if RLS is enabled:**
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'follows';
```

`rowsecurity` should be `true`. If not:
```sql
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
```

### Button Still Reverting?

**Check browser console for errors:**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Click Follow button
4. Look for any red error messages
5. Share the error messages for further debugging

---

## 🎉 Success Indicators

Once the fix is applied, you should see:

✅ **Console**: No errors (no 403, no 42501)
✅ **UI**: Button stays in correct state after clicking
✅ **Database**: Follow records are created/deleted successfully
✅ **Real-time**: Counts update across all devices
✅ **Performance**: Instant UI feedback (optimistic updates)

---

## 📝 Notes

- **No Code Changes Needed**: Your React Native code is already correct and includes optimistic updates
- **One-Time Setup**: You only need to run the SQL once per database
- **Production Ready**: These policies are secure and production-ready
- **Real-time Compatible**: Works perfectly with Supabase real-time subscriptions

---

## 🔗 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- `FOLLOW_RLS_POLICIES.sql` - Full SQL with detailed comments

---

**Status**: Ready to apply! 🚀

Run the SQL in Supabase, refresh your app, and the Follow button will work perfectly!

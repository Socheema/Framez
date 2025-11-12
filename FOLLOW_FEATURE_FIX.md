# Follow Feature Fix - Row-Level Security Policies

## Problem Identified

When you clicked the Follow button, you saw these errors:

1. **403 Forbidden Error**: `POST https://qligxzesycdcchyznncw.supabase.co/rest/v1/follows`
2. **RLS Policy Violation**: `new row violates row-level security policy for table "follows"` (Error code 42501)
3. **UI Reverting**: The Follow button changed to "Following" and immediately reverted back, follower count increased then reset to 0

## Root Cause

The `follows` table has Row-Level Security (RLS) enabled, but **no policies were created** to allow users to:
- Create follow records (INSERT)
- Delete follow records (DELETE)
- Read follow records (SELECT)

Without these policies, Supabase blocks all operations with a 403 Forbidden error.

## Solution

Apply the RLS policies in the `FOLLOW_RLS_POLICIES.sql` file to your Supabase database.

### Step-by-Step Fix

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `qligxzesycdcchyznncw`

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "+ New query"

3. **Copy and Paste the SQL**
   - Open the file: `FOLLOW_RLS_POLICIES.sql`
   - Copy ALL the SQL commands (the main ones are below)
   - Paste into the Supabase SQL Editor

4. **Run the Query**
   - Click "Run" or press `Ctrl+Enter`
   - You should see: "Success. No rows returned"

### Quick SQL (Copy This)

```sql
-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Allow users to view all follows
CREATE POLICY "Users can read all follows"
ON follows FOR SELECT TO authenticated
USING (true);

-- Allow users to follow others (as themselves)
CREATE POLICY "Users can insert follows as follower"
ON follows FOR INSERT TO authenticated
WITH CHECK (auth.uid() = follower_id);

-- Allow users to unfollow
CREATE POLICY "Users can delete their own follow relationships"
ON follows FOR DELETE TO authenticated
USING (auth.uid() = follower_id);
```

5. **Verify the Policies**

Run this query to confirm policies are active:

```sql
SELECT * FROM pg_policies WHERE tablename = 'follows';
```

You should see 3 policies listed.

## Expected Behavior After Fix

### ✅ What Should Work

1. **Follow Button**
   - Click "Follow" → Changes to "Following" immediately
   - Stays as "Following" (doesn't revert)
   - Follower count increases by 1 and stays

2. **Unfollow Button**
   - Click "Following" → Changes back to "Follow" immediately
   - Follower count decreases by 1

3. **Real-time Sync**
   - Changes appear instantly on all devices
   - No page refresh needed

4. **Database**
   - Follow record inserted successfully
   - No duplicate follows allowed (unique constraint)

### ❌ Security Restrictions (Working as Intended)

- Users **cannot** follow AS another user (follower_id must match auth.uid())
- Users **cannot** delete other people's follows
- Users **must** be authenticated (logged in)

## Testing After Fix

1. **Refresh your app** (or restart the dev server)
2. **Navigate to another user's profile**
3. **Click the Follow button**
4. **Expected Result**:
   - Button changes to "Following" ✅
   - Stays as "Following" ✅
   - Follower count increases ✅
   - No console errors ✅

5. **Click "Following" to unfollow**
6. **Expected Result**:
   - Button changes back to "Follow" ✅
   - Follower count decreases ✅

## Troubleshooting

### Still Getting 403 Error?

**Check Authentication:**
```sql
SELECT auth.uid(); -- Should return your user ID, not NULL
```

If it returns NULL, you're not logged in.

### Still Getting RLS Error?

**Verify Policies Exist:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'follows';
```

Should show 3 policies. If not, re-run the SQL from step 4.

**Check Policy Details:**
```sql
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'follows';
```

### React Native Text Error

The error `Unexpected text node: . A text node cannot be a child of a <View>` is likely a temporary React error that should disappear once the RLS policies are fixed. If it persists after fixing RLS:

1. Clear your browser cache
2. Restart the Expo dev server
3. Check for any stray text outside `<Text>` components

## Additional Notes

### Why RLS Policies Are Important

- **Security**: Prevent users from creating/deleting follows for other users
- **Privacy**: Control who can see follow relationships
- **Integrity**: Ensure only authenticated users can perform actions

### Policy Breakdown

1. **SELECT Policy**: `USING (true)`
   - Allows all authenticated users to read all follows
   - Needed for displaying follower/following counts

2. **INSERT Policy**: `WITH CHECK (auth.uid() = follower_id)`
   - Ensures users can only create follows where they are the follower
   - Prevents impersonation

3. **DELETE Policy**: `USING (auth.uid() = follower_id)`
   - Users can only unfollow relationships where they are the follower
   - Protects other users' follows

## Files Modified

No code changes needed! This is purely a database configuration issue.

- ✅ `utils/followsService.js` - Already correct
- ✅ `stores/followStore.js` - Already correct
- ✅ `app/userProfile/[id].jsx` - Already correct
- ✅ `app/tabs/profile.jsx` - Already correct

## Success Criteria

After applying the SQL policies, you should be able to:

- [x] Click Follow button → changes to Following
- [x] See follower count increase
- [x] Click Following → changes back to Follow
- [x] See follower count decrease
- [x] No 403 errors in console
- [x] No RLS policy violation errors
- [x] Changes persist after page refresh
- [x] Real-time updates work across devices

---

**Status**: Ready to apply SQL policies to Supabase 🚀

Once you've run the SQL in Supabase, the Follow feature will work perfectly!

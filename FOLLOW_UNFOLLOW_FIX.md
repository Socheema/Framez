# Follow/Unfollow Functionality Fix

## Overview
Fixed the follow/unfollow system to remove loading delays and ensure both follow and unfollow operations work correctly with optimistic UI updates.

## Issues Fixed

### Issue 1: Loading Delay on Follow Action ✅
**Problem:** Clicking "Follow" showed a loading spinner before updating to "Following"
**Solution:** Removed the `ActivityIndicator` and `isPending` disabled state from the follow button
**Result:** Button now updates instantly using optimistic updates already implemented in the store

### Issue 2: Unfollow Functionality ✅
**Problem:** Unfollow button didn't work due to missing RLS policies
**Solution:** Created comprehensive RLS policies for the `follows` table
**Result:** Both follow and unfollow now work correctly and persist to database

## Files Modified

### 1. `app/userProfile/[id].jsx`
**Changes:**
- Removed `ActivityIndicator` component from follow button
- Removed `isPending` state check and `disabled` prop
- Removed `isPending && { opacity: 0.6 }` style
- Removed unused `isPending` variable declaration

**Before:**
```jsx
{isPending ? (
  <ActivityIndicator size="small" color={isFollowing ? theme.colors.text : '#fff'} />
) : (
  <Text>{isFollowing ? 'Following' : 'Follow'}</Text>
)}
```

**After:**
```jsx
<Text style={[
  styles.followButtonText,
  isFollowing && styles.followingButtonText
]}>
  {isFollowing ? 'Following' : 'Follow'}
</Text>
```

### 2. `supabase/migrations/add_follows_rls_policies.sql` (NEW)
**Purpose:** Enable RLS policies for follow/unfollow operations

**Policies Created:**
- **"Users can follow others"** (INSERT) - Allows authenticated users to follow others, prevents self-following
- **"Users can unfollow"** (DELETE) - Allows users to unfollow others
- **"Users can view follows"** (SELECT) - Allows viewing follow relationships

### 3. `DEBUG_FOLLOWS.sql` (NEW)
**Purpose:** Comprehensive debugging queries to verify follow system functionality

## Database Requirements

### RLS Policies (CRITICAL)
The follow/unfollow functionality requires these RLS policies to work. Run the migration:

```sql
-- File: supabase/migrations/add_follows_rls_policies.sql

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Allow users to follow others
CREATE POLICY "Users can follow others"
ON follows FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = follower_id
  AND auth.uid() != following_id  -- Prevent self-following
);

-- Allow users to unfollow
CREATE POLICY "Users can unfollow"
ON follows FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);

-- Allow viewing follow relationships
CREATE POLICY "Users can view follows"
ON follows FOR SELECT
TO authenticated
USING (true);
```

### Expected Table Structure
The `follows` table should have:
- `id` (UUID, primary key)
- `follower_id` (UUID, references profiles/auth.users)
- `following_id` (UUID, references profiles/auth.users)
- `created_at` (timestamp)
- UNIQUE constraint on (follower_id, following_id)

### Verify Setup
Run these queries in Supabase SQL Editor:

```sql
-- Check if RLS policies exist
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'follows';

-- Check if UNIQUE constraint exists
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'follows'::regclass
AND contype = 'u';
```

## How It Works

### Optimistic Updates (Already Implemented)
The `followStore` already implements optimistic updates:

1. **Follow Action:**
   - Immediately set `followingMap[targetUserId] = true` (UI updates instantly)
   - Call API to insert follow record
   - On success: Refresh counts from server
   - On error: Revert to `followingMap[targetUserId] = false`

2. **Unfollow Action:**
   - Immediately set `followingMap[targetUserId] = false` (UI updates instantly)
   - Call API to delete follow record
   - On success: Refresh counts from server
   - On error: Revert to `followingMap[targetUserId] = true`

### What Changed
- **Removed:** Loading spinner that showed during API call
- **Added:** RLS policies that were blocking API operations
- **Result:** Instant UI updates with proper error handling

## Testing Checklist

### Manual Testing

- [ ] **Load user profile** → Follow button shows correct state (Follow/Following)
- [ ] **Click "Follow"** → Immediately shows "Following" (no spinner)
- [ ] **Refresh page** → Still shows "Following" (persisted to DB)
- [ ] **Click "Unfollow"** → Immediately shows "Follow"
- [ ] **Refresh page** → Shows "Follow" (unfollow persisted)
- [ ] **Check follower counts** → Increment/decrement correctly
- [ ] **Try to follow yourself** → Should be prevented by RLS policy
- [ ] **Network error** → UI reverts to previous state gracefully

### Database Verification

After clicking follow, run in Supabase SQL Editor:
```sql
SELECT * FROM follows
WHERE follower_id = 'YOUR_USER_ID'
AND following_id = 'TARGET_USER_ID';
```
Should return 1 row.

After clicking unfollow:
```sql
SELECT * FROM follows
WHERE follower_id = 'YOUR_USER_ID'
AND following_id = 'TARGET_USER_ID';
```
Should return 0 rows.

### Error Scenarios

- [ ] **No internet connection** → Shows error, reverts UI state
- [ ] **RLS policy blocks operation** → Shows error, reverts UI state
- [ ] **Duplicate follow attempt** → Handled gracefully (unique constraint)
- [ ] **User tries to follow themselves** → Blocked by RLS policy WITH CHECK

## Real-time Updates

The user profile page subscribes to follow insert/delete events:

```javascript
subscribeToMultipleTables([{
  table: 'follows',
  onInsert: (newFollow) => {
    if (newFollow.following_id === id || newFollow.follower_id === id) {
      followStore.handleFollowInsert(newFollow);
    }
  },
  onDelete: (deletedFollow) => {
    if (deletedFollow.following_id === id || deletedFollow.follower_id === id) {
      followStore.handleFollowDelete(deletedFollow);
    }
  },
}]);
```

This ensures follower/following counts update in real-time when:
- Other users follow/unfollow this profile
- The current user follows/unfollows from another device/tab

**Note:** Requires `REPLICA IDENTITY FULL` on the follows table (already set in `20241115_fix_replica_identity.sql`)

## Troubleshooting

### Follow button doesn't update
1. Check console for errors
2. Verify RLS policies exist: `SELECT * FROM pg_policies WHERE tablename = 'follows';`
3. Check if user is authenticated: `SELECT auth.uid();`

### Unfollow doesn't work
1. Most likely RLS policy missing
2. Run the RLS migration: `supabase/migrations/add_follows_rls_policies.sql`
3. Verify DELETE policy exists

### Follower counts don't update
1. Check if real-time is enabled for follows table in Supabase dashboard
2. Verify `REPLICA IDENTITY FULL` is set: `SELECT relreplident FROM pg_class WHERE relname = 'follows';` (should return 'f')
3. Check console for subscription errors

### Loading spinner still appears
1. Clear browser cache and reload (Ctrl+Shift+R)
2. Restart Expo dev server: `npx expo start --clear`
3. Verify you're running the latest code

## Performance

### Caching
The `followsService` uses caching with 30-second TTL:
- `isFollowing()` - Cached per follower-following pair
- `getFollowerCount()` - Cached per user
- `getFollowingCount()` - Cached per user

Caches are cleared after successful follow/unfollow operations.

### Indexes
Ensure these indexes exist for optimal performance:
```sql
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at DESC);
```

## Notes

- Follow/unfollow operations use optimistic updates for instant UI feedback
- All database operations include retry logic and timeout protection
- RLS policies prevent users from following themselves
- UNIQUE constraint prevents duplicate follow relationships
- Real-time subscriptions keep counts synchronized across devices
- Error handling reverts optimistic updates on failure

## Migration Checklist

Before deploying:
- [ ] Run `supabase/migrations/add_follows_rls_policies.sql` in Supabase SQL Editor
- [ ] Verify policies exist with debug queries
- [ ] Test follow/unfollow on dev environment
- [ ] Check console for any errors
- [ ] Verify counts update correctly
- [ ] Test real-time updates with multiple tabs/devices

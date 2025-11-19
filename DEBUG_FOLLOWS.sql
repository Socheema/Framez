-- DEBUG QUERIES FOR FOLLOW/UNFOLLOW FUNCTIONALITY
-- Run these in Supabase SQL Editor to diagnose and verify the follow system

-- 1. Check if follows table exists and view structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'follows'
ORDER BY ordinal_position;

-- 2. Check if RLS is enabled on follows table
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'follows';

-- 3. Check RLS policies on follows table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'follows'
ORDER BY cmd, policyname;

-- 4. View all follow relationships (for testing)
SELECT
  f.id,
  f.follower_id,
  f.following_id,
  f.created_at,
  p1.username as follower_username,
  p2.username as following_username
FROM follows f
LEFT JOIN profiles p1 ON f.follower_id = p1.id
LEFT JOIN profiles p2 ON f.following_id = p2.id
ORDER BY f.created_at DESC
LIMIT 20;

-- 5. Check follower count for a specific user (replace USER_ID)
-- SELECT COUNT(*) as follower_count
-- FROM follows
-- WHERE following_id = 'USER_ID_HERE';

-- 6. Check following count for a specific user (replace USER_ID)
-- SELECT COUNT(*) as following_count
-- FROM follows
-- WHERE follower_id = 'USER_ID_HERE';

-- 7. Check if user A is following user B (replace both IDs)
-- SELECT EXISTS(
--   SELECT 1 FROM follows
--   WHERE follower_id = 'USER_A_ID_HERE'
--   AND following_id = 'USER_B_ID_HERE'
-- ) as is_following;

-- 8. Find duplicate follow relationships (should return 0 rows with UNIQUE constraint)
SELECT
  follower_id,
  following_id,
  COUNT(*) as duplicate_count
FROM follows
GROUP BY follower_id, following_id
HAVING COUNT(*) > 1;

-- 9. Find self-follows (users following themselves - should return 0 rows)
SELECT
  f.*,
  p.username
FROM follows f
LEFT JOIN profiles p ON f.follower_id = p.id
WHERE f.follower_id = f.following_id;

-- 10. Check indexes on follows table (for performance)
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'follows'
ORDER BY indexname;

-- 11. Test INSERT permission (uncomment to test - will actually insert!)
-- This should succeed if RLS policies are correct
/*
INSERT INTO follows (follower_id, following_id)
VALUES (
  auth.uid(),  -- Current authenticated user
  'TARGET_USER_ID_HERE'  -- Replace with target user ID
);
*/

-- 12. Test DELETE permission (uncomment to test - will actually delete!)
/*
DELETE FROM follows
WHERE follower_id = auth.uid()
AND following_id = 'TARGET_USER_ID_HERE';  -- Replace with target user ID
*/

-- 13. View recent follow activity
SELECT
  f.id,
  f.created_at,
  p1.username as follower,
  p2.username as following,
  EXTRACT(EPOCH FROM (NOW() - f.created_at)) as seconds_ago
FROM follows f
LEFT JOIN profiles p1 ON f.follower_id = p1.id
LEFT JOIN profiles p2 ON f.following_id = p2.id
ORDER BY f.created_at DESC
LIMIT 10;

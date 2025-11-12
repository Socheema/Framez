-- ============================================
-- VERIFICATION SCRIPT: Test RLS Policies
-- ============================================
-- Run this in Supabase SQL Editor AFTER applying the main policies

-- 1. Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'follows';

-- Expected: rowsecurity = true

-- ============================================

-- 2. List all policies on follows table
SELECT
  policyname as "Policy Name",
  cmd as "Command",
  CASE
    WHEN cmd = 'SELECT' THEN 'Read follows'
    WHEN cmd = 'INSERT' THEN 'Create follows'
    WHEN cmd = 'DELETE' THEN 'Remove follows'
    ELSE cmd
  END as "Purpose"
FROM pg_policies
WHERE tablename = 'follows'
ORDER BY cmd;

-- Expected: 3 policies (SELECT, INSERT, DELETE)

-- ============================================

-- 3. View detailed policy configurations
SELECT
  policyname as "Policy Name",
  cmd as "Command",
  roles as "Roles",
  qual as "USING Clause",
  with_check as "WITH CHECK Clause"
FROM pg_policies
WHERE tablename = 'follows';

-- Expected:
-- SELECT: qual = true (anyone authenticated can read)
-- INSERT: with_check = auth.uid() = follower_id (can only follow as yourself)
-- DELETE: qual = auth.uid() = follower_id (can only delete own follows)

-- ============================================

-- 4. Test your current authentication
SELECT
  auth.uid() as "Your User ID",
  CASE
    WHEN auth.uid() IS NOT NULL THEN 'Authenticated ✓'
    ELSE 'Not Authenticated ✗'
  END as "Auth Status";

-- Expected: Should show your user ID if logged in

-- ============================================

-- 5. Count existing follows (tests SELECT policy)
SELECT COUNT(*) as "Total Follows" FROM follows;

-- If this works, SELECT policy is correct
-- If you get permission denied, SELECT policy is missing

-- ============================================

-- 6. Check follows table structure
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'follows'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid)
-- follower_id (uuid) - who is following
-- following_id (uuid) - who is being followed
-- created_at (timestamp)

-- ============================================

-- 7. Check for unique constraint (prevents duplicate follows)
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'follows'
  AND constraint_type IN ('UNIQUE', 'PRIMARY KEY');

-- Expected: UNIQUE constraint on (follower_id, following_id)

-- ============================================
-- RESULTS INTERPRETATION
-- ============================================

/*
✅ ALL CHECKS PASSED if:
1. RLS Enabled = true
2. 3 policies exist (SELECT, INSERT, DELETE)
3. Auth Status = "Authenticated ✓"
4. Total Follows query returns a number (not error)
5. Columns include id, follower_id, following_id, created_at
6. UNIQUE constraint exists on follower_id + following_id

❌ ISSUES if:
1. RLS Enabled = false → Run: ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
2. Less than 3 policies → Re-run policy creation SQL
3. Auth Status = "Not Authenticated" → Log out and log back in
4. Total Follows query fails → SELECT policy missing
5. Missing columns → Check table migration
6. No UNIQUE constraint → Duplicate follows possible

NEXT STEPS:
- If all checks pass → Test Follow button in app
- If any check fails → Fix the specific issue shown
- After fixing → Refresh app and test again
*/

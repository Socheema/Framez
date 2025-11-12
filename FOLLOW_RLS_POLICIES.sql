-- ============================================
-- Row-Level Security Policies for Follows Table
-- ============================================
-- This file contains the RLS policies needed for the follow/unfollow feature
-- Run these in your Supabase SQL Editor

-- 1. Enable RLS on follows table (if not already enabled)
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- 2. DROP existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view all follows" ON follows;
DROP POLICY IF EXISTS "Users can create their own follows" ON follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON follows;
DROP POLICY IF EXISTS "Users can read all follows" ON follows;
DROP POLICY IF EXISTS "Users can insert follows as follower" ON follows;
DROP POLICY IF EXISTS "Users can delete their own follow relationships" ON follows;

-- ============================================
-- READ POLICY: Allow all authenticated users to view follows
-- ============================================
-- This allows users to see who follows whom (for displaying follower/following counts)
CREATE POLICY "Users can read all follows"
ON follows
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- INSERT POLICY: Allow users to create follow records where they are the follower
-- ============================================
-- Users can only create follows where they are the follower (not impersonate others)
CREATE POLICY "Users can insert follows as follower"
ON follows
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

-- ============================================
-- DELETE POLICY: Allow users to delete their own follow relationships
-- ============================================
-- Users can only unfollow if they are the follower in the relationship
CREATE POLICY "Users can delete their own follow relationships"
ON follows
FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the policies are working:

-- 1. Check if RLS is enabled
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename = 'follows';

-- 2. List all policies on follows table
-- SELECT * FROM pg_policies WHERE tablename = 'follows';

-- ============================================
-- EXPECTED BEHAVIOR
-- ============================================
-- ✅ Users can view all follow relationships (for counts/lists)
-- ✅ Users can follow other users (INSERT with themselves as follower)
-- ✅ Users can unfollow (DELETE where they are the follower)
-- ❌ Users cannot follow AS another user (prevented by INSERT policy)
-- ❌ Users cannot delete other people's follows (prevented by DELETE policy)

-- ============================================
-- TROUBLESHOOTING
-- ============================================
-- If you get error 42501 (permission denied):
-- 1. Make sure you're authenticated (auth.uid() returns a value)
-- 2. Check that the follower_id matches auth.uid()
-- 3. Verify RLS is enabled: SELECT * FROM pg_tables WHERE tablename = 'follows'
-- 4. Check policies exist: SELECT * FROM pg_policies WHERE tablename = 'follows'

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- To disable RLS temporarily for testing:
-- ALTER TABLE follows DISABLE ROW LEVEL SECURITY;
--
-- To re-enable:
-- ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

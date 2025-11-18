-- Add RLS policies for follows table to allow follow/unfollow functionality
-- This ensures users can follow others, unfollow, and view follow relationships

-- Enable RLS if not already enabled
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Policy: Users can follow others (INSERT)
DROP POLICY IF EXISTS "Users can follow others" ON follows;
CREATE POLICY "Users can follow others"
ON follows FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = follower_id
  AND auth.uid() != following_id  -- Prevent self-following
);

-- Policy: Users can unfollow (DELETE)
DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Users can unfollow"
ON follows FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);

-- Policy: Users can view follow relationships (SELECT)
-- Allow viewing all follow relationships (needed for follower/following counts and checking follow status)
DROP POLICY IF EXISTS "Users can view follows" ON follows;
CREATE POLICY "Users can view follows"
ON follows FOR SELECT
TO authenticated
USING (true);

-- Verify policies were created
SELECT 
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'follows'
ORDER BY cmd, policyname;

-- Verify table structure (for documentation)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'follows'
ORDER BY ordinal_position;

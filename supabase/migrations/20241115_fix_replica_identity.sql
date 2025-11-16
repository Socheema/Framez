-- Fix replica identity for realtime delete events
-- This ensures that delete events include all column values

-- Enable full replica identity for likes table
ALTER TABLE likes REPLICA IDENTITY FULL;

-- Enable full replica identity for comments table
ALTER TABLE comments REPLICA IDENTITY FULL;

-- Enable full replica identity for follows table
ALTER TABLE follows REPLICA IDENTITY FULL;

-- Verify the changes
-- You can check replica identity with:
-- SELECT relreplident FROM pg_class WHERE relname = 'likes';
-- d = default (primary key only), f = full (all columns)

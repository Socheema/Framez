-- DEBUG QUERIES FOR UNREAD MESSAGES ISSUE
-- Run these in Supabase SQL Editor to diagnose the problem

-- 1. Check if is_read column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'messages' AND column_name = 'is_read';

-- 2. Check if read_status column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'messages' AND column_name = 'read_status';

-- 3. Check actual messages in conversation 0d67a0fb-dc8a-4423-b95a-8d7537f0162e
SELECT
  id,
  conversation_id,
  sender_id,
  is_read,
  read_status,
  text,
  created_at
FROM messages
WHERE conversation_id = '0d67a0fb-dc8a-4423-b95a-8d7537f0162e'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Count unread messages for user acbf8d39-0eeb-427e-81f7-5ba459135985
SELECT COUNT(*)
FROM messages
WHERE conversation_id = '0d67a0fb-dc8a-4423-b95a-8d7537f0162e'
  AND sender_id != 'acbf8d39-0eeb-427e-81f7-5ba459135985'
  AND is_read = false;

-- 5. Check RLS policies on messages table
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
WHERE tablename = 'messages';

-- 6. Try manual update (THIS WILL ACTUALLY UPDATE - BE CAREFUL)
-- Uncomment to test if UPDATE works at all
/*
UPDATE messages
SET is_read = true
WHERE conversation_id = '0d67a0fb-dc8a-4423-b95a-8d7537f0162e'
  AND sender_id != 'acbf8d39-0eeb-427e-81f7-5ba459135985'
  AND is_read = false;
*/

-- 7. Check if messages have the column at all
SELECT COUNT(*) as total_messages,
       COUNT(CASE WHEN is_read IS NOT NULL THEN 1 END) as messages_with_is_read,
       COUNT(CASE WHEN is_read = true THEN 1 END) as read_messages,
       COUNT(CASE WHEN is_read = false THEN 1 END) as unread_messages
FROM messages;

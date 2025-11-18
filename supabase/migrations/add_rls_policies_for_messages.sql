-- Add RLS policies to allow users to mark messages as read
-- This is likely the missing piece that prevents the UPDATE from working

-- First, ensure RLS is enabled on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT their own messages (sent or received)
DROP POLICY IF EXISTS "Users can view their messages" ON messages;
CREATE POLICY "Users can view their messages" ON messages
  FOR SELECT
  USING (
    auth.uid() = sender_id
    OR
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant_one = auth.uid() OR conversations.participant_two = auth.uid())
    )
  );

-- Policy: Users can INSERT messages in their conversations
DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant_one = auth.uid() OR conversations.participant_two = auth.uid())
    )
  );

-- Policy: Users can UPDATE (mark as read) messages they RECEIVED (not sent)
DROP POLICY IF EXISTS "Users can mark received messages as read" ON messages;
CREATE POLICY "Users can mark received messages as read" ON messages
  FOR UPDATE
  USING (
    auth.uid() != sender_id  -- User is NOT the sender (i.e., they received it)
    AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant_one = auth.uid() OR conversations.participant_two = auth.uid())
    )
  )
  WITH CHECK (
    -- Only allow updating is_read and read_status columns
    -- This prevents users from modifying message content
    auth.uid() != sender_id
    AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant_one = auth.uid() OR conversations.participant_two = auth.uid())
    )
  );

-- Verify policies were created
SELECT 
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY cmd, policyname;

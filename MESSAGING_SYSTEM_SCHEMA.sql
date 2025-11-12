-- ============================================
-- MESSAGING SYSTEM: Database Schema & Policies
-- ============================================
-- Run this in Supabase SQL Editor to set up the messaging system

-- ============================================
-- 1. CREATE CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_one UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_two UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure participant_one is always <= participant_two for consistency
  CONSTRAINT conversations_participants_ordered CHECK (participant_one < participant_two),
  -- Unique constraint: one conversation per pair
  CONSTRAINT conversations_unique_pair UNIQUE (participant_one, participant_two)
);

-- ============================================
-- 2. CREATE MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  read_status BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================
-- Index for fetching user's conversations
CREATE INDEX IF NOT EXISTS idx_conversations_participant_one ON conversations(participant_one);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_two ON conversations(participant_two);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- Index for fetching conversation messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- Index for unread messages count
CREATE INDEX IF NOT EXISTS idx_messages_read_status ON messages(read_status) WHERE read_status = FALSE;

-- ============================================
-- 4. ENABLE ROW-LEVEL SECURITY
-- ============================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. DROP EXISTING POLICIES (if any)
-- ============================================
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

-- ============================================
-- 6. CREATE RLS POLICIES FOR CONVERSATIONS
-- ============================================

-- SELECT: Users can view conversations they're part of
CREATE POLICY "Users can view their own conversations"
ON conversations
FOR SELECT
TO authenticated
USING (
  auth.uid() = participant_one OR auth.uid() = participant_two
);

-- INSERT: Users can create conversations they're part of
CREATE POLICY "Users can create conversations"
ON conversations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = participant_one OR auth.uid() = participant_two
);

-- UPDATE: Users can update conversations they're part of
CREATE POLICY "Users can update their conversations"
ON conversations
FOR UPDATE
TO authenticated
USING (
  auth.uid() = participant_one OR auth.uid() = participant_two
)
WITH CHECK (
  auth.uid() = participant_one OR auth.uid() = participant_two
);

-- ============================================
-- 7. CREATE RLS POLICIES FOR MESSAGES
-- ============================================

-- SELECT: Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
ON messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (conversations.participant_one = auth.uid() OR conversations.participant_two = auth.uid())
  )
);

-- INSERT: Users can send messages in their conversations
CREATE POLICY "Users can send messages in their conversations"
ON messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (conversations.participant_one = auth.uid() OR conversations.participant_two = auth.uid())
  )
);

-- UPDATE: Users can update their own messages (for read status)
CREATE POLICY "Users can update their own messages"
ON messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (conversations.participant_one = auth.uid() OR conversations.participant_two = auth.uid())
  )
);

-- ============================================
-- 8. ENABLE REALTIME FOR MESSAGES
-- ============================================
-- This allows messages to appear instantly without refresh

-- Note: You may need to enable Realtime in Supabase Dashboard:
-- 1. Go to Database → Replication
-- 2. Enable replication for 'messages' table
-- 3. Select INSERT, UPDATE, DELETE events

-- ============================================
-- 9. CREATE HELPER FUNCTIONS (OPTIONAL)
-- ============================================

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_count(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM messages m
  JOIN conversations c ON m.conversation_id = c.id
  WHERE (c.participant_one = user_id OR c.participant_two = user_id)
    AND m.sender_id != user_id
    AND m.read_status = FALSE;

  RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all messages in a conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_as_read(
  conversation_id_param UUID,
  user_id_param UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE messages
  SET read_status = TRUE, updated_at = NOW()
  WHERE conversation_id = conversation_id_param
    AND sender_id != user_id_param
    AND read_status = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. VERIFICATION QUERIES
-- ============================================

-- Check if tables exist
SELECT
  table_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = table_name)
    THEN '✅ Exists'
    ELSE '❌ Missing'
  END as status
FROM (VALUES ('conversations'), ('messages')) AS t(table_name);

-- Check RLS is enabled
SELECT
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename IN ('conversations', 'messages');

-- Check policies exist
SELECT
  tablename,
  policyname,
  cmd as "Command"
FROM pg_policies
WHERE tablename IN ('conversations', 'messages')
ORDER BY tablename, cmd;

-- Count should show 6 policies total:
-- - 3 for conversations (SELECT, INSERT, UPDATE)
-- - 3 for messages (SELECT, INSERT, UPDATE)

-- ============================================
-- EXPECTED RESULTS
-- ============================================
/*
✅ SUCCESS if you see:
1. Both tables exist (conversations, messages)
2. RLS enabled = true for both tables
3. 6 policies created (3 per table)
4. Indexes created successfully
5. Helper functions created

🎉 Messaging system is now ready to use!

NEXT STEPS:
1. Enable Realtime in Supabase Dashboard (Database → Replication)
2. Select 'messages' table for replication
3. Test sending a message from the app
4. Verify messages appear in real-time
*/

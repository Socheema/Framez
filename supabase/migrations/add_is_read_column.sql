-- =====================================================
-- Migration: Add is_read column to messages table
-- Description: Adds unread message tracking functionality
-- Date: 2025-01-18
-- =====================================================

-- Step 1: Add is_read column if it doesn't exist
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Step 2: Set existing messages as read (optional - depends on requirements)
-- Uncomment if you want all existing messages to be marked as read
-- UPDATE public.messages SET is_read = true WHERE is_read IS NULL;

-- Step 3: Create index for faster queries on is_read column
CREATE INDEX IF NOT EXISTS messages_is_read_idx 
ON public.messages(is_read);

-- Step 4: Create composite index for conversation + read status queries
CREATE INDEX IF NOT EXISTS messages_conversation_read_idx 
ON public.messages(conversation_id, is_read);

-- Step 5: Create composite index for efficient unread counting
CREATE INDEX IF NOT EXISTS messages_conversation_sender_read_idx 
ON public.messages(conversation_id, sender_id, is_read);

-- =====================================================
-- Verification Queries (Run these to verify)
-- =====================================================

-- Check if column exists:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'messages' AND column_name = 'is_read';

-- Check indexes:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'messages';

-- Count unread messages:
-- SELECT COUNT(*) as unread_count
-- FROM public.messages
-- WHERE is_read = false;

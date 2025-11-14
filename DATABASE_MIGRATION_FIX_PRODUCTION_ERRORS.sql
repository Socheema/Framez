-- ============================================
-- PRODUCTION ERROR FIXES
-- Database Migration for Framez
-- ============================================
-- Run this in Supabase SQL Editor to fix production errors
-- This fixes ERROR 2: "column messages.read_status does not exist"

-- ============================================
-- 1. ENSURE READ_STATUS COLUMN EXISTS
-- ============================================
-- If the column doesn't exist, this adds it
-- If it already exists, this does nothing (safe to run multiple times)

ALTER TABLE IF EXISTS messages 
ADD COLUMN IF NOT EXISTS read_status BOOLEAN DEFAULT FALSE;

-- ============================================
-- 2. CREATE INDEX FOR READ_STATUS (if not exists)
-- ============================================
-- This helps queries filter unread messages efficiently
CREATE INDEX IF NOT EXISTS idx_messages_read_status 
ON messages(read_status) 
WHERE read_status = FALSE;

-- ============================================
-- 3. VERIFY COLUMN EXISTS
-- ============================================
-- This query will show you the messages table structure
-- Run this after the above to verify read_status column exists
/*
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'messages' AND column_name = 'read_status';

-- Expected output:
-- column_name | data_type | is_nullable | column_default
-- read_status | boolean   | YES         | false
*/

-- ============================================
-- OPTIONAL: Fix any existing data issues
-- ============================================
-- If there are NULL values in read_status, set them to FALSE
UPDATE messages SET read_status = FALSE WHERE read_status IS NULL;

-- ============================================
-- NOTES FOR DEPLOYMENT
-- ============================================
/*
PRODUCTION ERROR #2 - Database Column Missing:
Error: "column messages.read_status does not exist"
Code: 42703 (PostgreSQL error code for undefined column)

ROOT CAUSE:
The application code references the 'read_status' column in messages table,
but the column may not exist in the production Supabase database.

SOLUTION:
1. Run this entire SQL file in Supabase SQL Editor
2. The migration safely adds the column if it doesn't exist
3. It's safe to run multiple times (uses IF NOT EXISTS)
4. After running, redeploy the app

VERIFICATION:
After running this SQL, you should be able to:
- Send messages without errors
- Messages won't send twice anymore (see messageStore.js fix)
- Message read status tracking will work
*/

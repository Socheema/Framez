# Unread Message Notifications Implementation

## Overview
This implementation adds comprehensive unread message tracking with visual indicators and automatic mark-as-read functionality to the Framez Social messaging system.

## Features Implemented

### 1. **Unread Message Badge on Floating Message Button**
- Red notification badge appears when there are unread messages
- Shows exact count (1, 5, 99+)
- Updates in real-time when new messages arrive
- Badge disappears when all messages are read
- **Location:** `components/FloatingMessageButton.jsx`

### 2. **Mark as Read Functionality**
- Messages automatically marked as read when conversation is opened
- Only marks messages received (not sent) by current user
- Only updates previously unread messages
- Database updated immediately
- Unread count decreases after marking as read
- **Location:** `components/MessageModal.jsx`, `stores/messageStore.js`

### 3. **Unread Indicators in Conversations List**
- Shows unread count per conversation with badge
- Bold text for conversation name when unread
- Bold text for last message when unread
- ~~Blue dot indicator removed (redundant with badge)~~
- All indicators disappear after opening chat
- **Location:** `components/ConversationModal.jsx`

### 4. **Real-time Updates**
- New messages appear without manual refresh
- Unread count updates automatically across all components
- Works across multiple devices/tabs
- **Location:** `stores/messageStore.js`

## Files Modified

### New Files Created:
1. **`utils/messageHelpers.js`** - Helper functions for unread management
   - `getTotalUnreadCount(userId)` - Get total unread across all conversations
   - `markConversationAsRead(conversationId, userId)` - Mark conversation as read
   - `getConversationUnreadCount(conversationId, userId)` - Get unread for one conversation
   - `getMultipleConversationUnreadCounts(conversationIds, userId)` - Batch unread counts

2. **`supabase/migrations/add_is_read_column.sql`** - Database migration
   - Adds `is_read` column to messages table
   - Creates performance indexes
   - Includes verification queries

### Modified Files:
1. **`stores/messageStore.js`** - Enhanced store with unread tracking
   - Import helper functions
   - Update `loadConversations` to fetch unread counts
   - Update `openConversationWithUser` to mark as read
   - Update `openConversation` to mark as read
   - Enhanced `subscribeToMessages` for real-time updates
   - Updated `markAsRead` to refresh unread counts
   - Added `refreshUnreadCount` method
   - Added `subscribeToAllMessages` for global updates
   - Updated `backToConversations` to reload conversations with fresh unread counts

2. **`components/FloatingMessageButton.jsx`** - Added unread badge
   - Shows count instead of just dot
   - Real-time subscription to message updates
   - Cleanup on unmount

3. **`components/ConversationModal.jsx`** - Added unread indicators
   - Unread count badges per conversation
   - Bold text for unread conversations
   - ~~Blue dot indicator removed (redundant)~~
   - Updated styles
   - Reloads conversations when modal opens to ensure fresh unread counts

4. **`components/MessageModal.jsx`** - Enhanced mark-as-read
   - Marks messages as read when conversation opens
   - Passes user ID to backToConversations for proper reload
   - Updates comment for clarity

## Database Requirements

### Required Column:
The `messages` table needs an `is_read` column. Run the migration:

```sql
-- Run this in Supabase SQL Editor
-- File: supabase/migrations/add_is_read_column.sql

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS messages_is_read_idx 
ON public.messages(is_read);

CREATE INDEX IF NOT EXISTS messages_conversation_read_idx 
ON public.messages(conversation_id, is_read);

CREATE INDEX IF NOT EXISTS messages_conversation_sender_read_idx 
ON public.messages(conversation_id, sender_id, is_read);
```

### ⚠️ CRITICAL: Row-Level Security (RLS) Policies
**This is likely the missing piece if mark-as-read is not working!**

Supabase blocks UPDATE queries by default. You MUST add RLS policies to allow users to mark messages as read:

```sql
-- Run this in Supabase SQL Editor
-- File: supabase/migrations/add_rls_policies_for_messages.sql

-- Ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their messages
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

-- Policy: Users can send messages
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

-- Policy: Users can mark received messages as read (CRITICAL!)
DROP POLICY IF EXISTS "Users can mark received messages as read" ON messages;
CREATE POLICY "Users can mark received messages as read" ON messages
  FOR UPDATE
  USING (
    auth.uid() != sender_id  -- User is NOT the sender
    AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant_one = auth.uid() OR conversations.participant_two = auth.uid())
    )
  )
  WITH CHECK (
    auth.uid() != sender_id
    AND
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant_one = auth.uid() OR conversations.participant_two = auth.uid())
    )
  );
```

### To verify setup:
```sql
-- Check if column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'messages' AND column_name = 'is_read';

-- Check if RLS policies exist
SELECT tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY cmd, policyname;
```

## Testing Checklist

### Test 1: Red Badge on Message Icon
- [ ] Badge appears when there are unread messages
- [ ] Badge shows correct count (test with 1, 5, 15 messages)
- [ ] Badge shows "99+" when count exceeds 99
- [ ] Badge disappears when all messages are read
- [ ] Badge updates in real-time when new message arrives
- [ ] Badge updates when messages are marked as read

### Test 2: Mark as Read Functionality
- [ ] Opening conversation marks messages as read
- [ ] Only marks messages sent TO current user (not FROM)
- [ ] Only marks previously unread messages
- [ ] Database updated immediately (check Supabase)
- [ ] Red badge count decreases after marking as read
- [ ] Works when opening from conversation list
- [ ] Works when opening via user profile message button

### Test 3: Conversations List
- [ ] Shows correct unread count per conversation
- [ ] Bold text for conversations with unread messages
- [ ] ~~Blue dot removed (redundant with badge)~~
- [ ] Unread indicators disappear after opening chat
- [ ] Unread indicators stay gone when navigating back (no flashing)
- [ ] List updates when new message arrives
- [ ] List updates when messages are read
- [ ] List reloads with fresh counts when modal opens

### Test 4: Real-time Updates
- [ ] New messages appear without refresh
- [ ] Unread count updates automatically
- [ ] Works across multiple browser tabs
- [ ] Works on different devices (if testing multi-device)
- [ ] Subscriptions clean up on unmount
- [ ] No memory leaks (check console)

### Test 5: Edge Cases
- [ ] Works when no conversations exist
- [ ] Works when no messages exist
- [ ] Works when conversation has no messages
- [ ] Handles network errors gracefully
- [ ] Handles database errors gracefully
- [ ] Works after app reload
- [ ] Works after user logout/login

### Test 6: Performance
- [ ] No lag when opening conversations
- [ ] Smooth scrolling in conversations list
- [ ] Fast badge updates
- [ ] Efficient database queries (check Supabase logs)
- [ ] No excessive re-renders

## Visual Reference

### Before Implementation:
```
Feed Header
[🏠 Feed        💬 👤]
No indication of unread messages
```

### After Implementation:
```
Feed Header
[🏠 Feed    💬(3) 👤]
           └─ Red badge with count
```

### Conversations List:
```
┌─────────────────────────┐
│   John Doe         (2)  │ ← Unread count + bold text
│   Hey, how are you?     │ ← Bold text
├─────────────────────────┤
│   Sarah Smith           │ ← No indicator
│   See you tomorrow      │ ← Normal text
└─────────────────────────┘
```

### After Opening John's Chat:
```
┌─────────────────────────┐
│   John Doe              │ ← No more indicators
│   Hey, how are you?     │ ← Normal weight
└─────────────────────────┘

Badge updates: 3 → 1
```

## Troubleshooting

### Badge not showing:
1. Check if `is_read` column exists in database
2. Run migration SQL if missing
3. Check console for errors
4. Verify user is logged in

### Messages not marking as read (MOST COMMON ISSUE):
1. **CHECK RLS POLICIES FIRST!** - This is the #1 reason mark-as-read fails
   - Run the RLS policies migration above
   - Verify policies exist: `SELECT * FROM pg_policies WHERE tablename = 'messages';`
2. Check if `markConversationAsRead` is being called (console logs)
3. Look for errors in console (403 Forbidden = RLS policy blocking)
4. Verify conversation ID is correct
5. Check database permissions
6. Run debug queries (see DEBUG_QUERIES.sql file)

### Unread count not updating:
1. Verify real-time subscription is active
2. Check Supabase realtime is enabled
3. Check console for subscription errors
4. Verify `refreshUnreadCount` is being called
5. Check if RLS policies allow SELECT on messages

### Performance issues:
1. Check if indexes are created properly
2. Verify no duplicate subscriptions
3. Check for memory leaks in console
4. Ensure proper cleanup on unmount

### Still seeing unread messages after opening:
1. **Most likely RLS policy issue** - update is being blocked
2. Check terminal logs for `waitForConversationRead timed out`
3. Run DEBUG_QUERIES.sql to inspect actual database state
4. Verify messages actually update in database with SQL query
5. Clear browser cache and reload (Ctrl+Shift+R)

## API Reference

### Helper Functions (`utils/messageHelpers.js`)

#### `getTotalUnreadCount(userId)`
Returns total unread message count for user across all conversations.

**Parameters:**
- `userId` (string) - Current user's ID

**Returns:**
- `Promise<number>` - Total unread count

#### `markConversationAsRead(conversationId, userId)`
Marks all messages in a conversation as read.

**Parameters:**
- `conversationId` (string) - Conversation ID
- `userId` (string) - Current user's ID

**Returns:**
- `Promise<boolean>` - Success status

#### `getConversationUnreadCount(conversationId, userId)`
Gets unread count for a specific conversation.

**Parameters:**
- `conversationId` (string) - Conversation ID
- `userId` (string) - Current user's ID

**Returns:**
- `Promise<number>` - Unread count for this conversation

### Store Methods (`stores/messageStore.js`)

#### `refreshUnreadCount(userId)`
Refreshes the total unread count for the user.

**Parameters:**
- `userId` (string) - Current user's ID

**Returns:**
- `Promise<number>` - Total unread count

#### `subscribeToAllMessages(userId)`
Subscribes to all message updates for unread count updates.

**Parameters:**
- `userId` (string) - Current user's ID

**Returns:**
- Supabase subscription object

## Notes

- All unread counts are fetched from database on demand
- Real-time subscriptions keep counts up to date
- Messages are marked as read only when conversation is actually opened
- The system handles multiple conversations efficiently with batch queries
- All database operations include proper error handling
- Subscriptions are properly cleaned up to prevent memory leaks

## Future Enhancements (Optional)

- [ ] Push notifications for new messages
- [ ] Unread indicator in tab navigation badge
- [ ] Sound notification when new message arrives
- [ ] Mark all as read button
- [ ] Snooze/mute conversations
- [ ] Different badge colors for priority messages

# 🚀 Messaging System - Quick Setup Guide

## ✅ Step 1: Create Database Tables (2 minutes)

1. Open Supabase Dashboard → SQL Editor
2. Copy/paste this SQL:

```sql
-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their own conversations"
ON conversations FOR SELECT TO authenticated
USING (auth.uid() = participant_one OR auth.uid() = participant_two);

CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = participant_one OR auth.uid() = participant_two);

CREATE POLICY "Users can update their conversations"
ON conversations FOR UPDATE TO authenticated
USING (auth.uid() = participant_one OR auth.uid() = participant_two);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversations
  WHERE conversations.id = messages.conversation_id
  AND (conversations.participant_one = auth.uid() OR conversations.participant_two = auth.uid())
));

CREATE POLICY "Users can send messages in their conversations"
ON messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own messages"
ON messages FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversations
  WHERE conversations.id = messages.conversation_id
  AND (conversations.participant_one = auth.uid() OR conversations.participant_two = auth.uid())
));
```

3. Click "Run" ▶️

## ✅ Step 2: Enable Realtime (1 minute)

1. Supabase Dashboard → Database → Replication
2. Find `messages` table
3. Toggle replication **ON**
4. Select: INSERT, UPDATE, DELETE
5. Save

## ✅ Step 3: Test the App (1 minute)

```bash
npx expo start -c
```

### Expected Results:

✅ Floating message icon appears on Feed, Create, Profile
✅ Icon positioned above tab bar
✅ Clicking icon opens conversations list
✅ Message button on user profile opens chat
✅ Can send and receive messages instantly
✅ Red dot shows for unread messages

---

## 📂 What Was Created

### New Components
- `components/FloatingMessageButton.jsx` - Floating icon with unread indicator
- `components/ConversationModal.jsx` - List of conversations
- `components/MessageModal.jsx` - Full chat interface

### New Stores
- `stores/messageStore.js` - Message state management

### Modified Pages
- `app/tabs/feed.jsx` - Added floating button + modals
- `app/tabs/create.jsx` - Added floating button + modals
- `app/tabs/profile.jsx` - Added floating button + modals
- `app/userProfile/[id].jsx` - Updated message button

### Services
- `utils/messagesService.js` - Enhanced with last message + unread count

---

## 🎯 Features

### 🧭 Floating Icon
- Positioned: `bottom: 110px, right: 20px`
- Above tab bar (no overlap)
- Primary color (#E41E3F)
- Red dot when unread messages

### 💬 Conversation Modal
- Lists all conversations
- Shows: Avatar, name, last message, time
- Unread badges
- Opens instantly (no loading)

### 📩 Message Modal
- Full chat interface
- Real-time message updates
- Auto-scroll to bottom
- Back button to conversations

### 🔴 Unread Indicator
- Red dot on floating icon
- Updates in real-time
- Disappears when messages read

---

## 🐛 Troubleshooting

### Messages not appearing?
1. Check Realtime is enabled: Dashboard → Database → Replication
2. Verify policies exist: `SELECT * FROM pg_policies WHERE tablename IN ('conversations', 'messages')`

### Red dot not showing?
1. Check console for errors
2. Verify you're logged in
3. Send a message from another user

### Icon overlapping tab bar?
- Adjust `bottom` value in `FloatingMessageButton.jsx`
- Current: `bottom: hp(13.5)`

---

## 📖 Full Documentation

See `MESSAGING_SYSTEM_COMPLETE.md` for:
- Complete architecture
- Database schema details
- User flows
- Testing checklist
- Security details
- Performance optimization

---

## 🎉 Done!

Your messaging system is now ready to use!

**Next Steps:**
1. Test sending messages between users
2. Verify real-time updates work
3. Check unread indicators appear
4. Test on multiple devices

---

**Files to Reference:**
- Setup: `MESSAGING_SYSTEM_SCHEMA.sql`
- Complete docs: `MESSAGING_SYSTEM_COMPLETE.md`
- This guide: `MESSAGING_QUICK_START.md`

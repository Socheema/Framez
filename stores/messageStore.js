import { create } from 'zustand';
import {
    getMessages,
    getOrCreateConversation,
    getUserConversations,
    sendMessage as sendMessageService,
} from '../utils/messagesService';
import { supabase } from '../utils/supabase';
import { getMultipleConversationUnreadCounts, getTotalUnreadCount, markConversationAsRead, waitForConversationRead } from '../utils/messageHelpers';

export const useMessageStore = create((set, get) => ({
  // State
  conversations: [],
  currentConversation: null,
  messages: [],
  unreadCount: 0,
  pendingRead: {}, // { conversationId: timestamp } to avoid flicker
  loading: false,
  isSending: false,
  error: null,
  suppressImmediateRefresh: false,
  conversationModalVisible: false,
  messageModalVisible: false,
  messageSubscription: null,

  // Actions

  /**
   * Load all conversations for the current user
   */
  loadConversations: async (userId) => {
    try {
      console.debug('[MessageStore] loadConversations start for user', userId);
      set({ loading: true, error: null });
      const conversations = await getUserConversations(userId);

      // Get unread counts for all conversations
      const conversationIds = conversations.map(c => c.id);
      const unreadCounts = await getMultipleConversationUnreadCounts(conversationIds, userId);

      // Add unread count to each conversation with pendingRead suppression
      const now = Date.now();
      const pendingRead = get().pendingRead || {};
      const newPending = { ...pendingRead };
      const TTL = 5000;
      const conversationsWithUnread = conversations.map(conv => {
        const dbCount = unreadCounts[conv.id] || 0;
        // If DB shows 0 unread, remove pending flag as it's resolved
        if (newPending[conv.id] && dbCount === 0) delete newPending[conv.id];
        const unread_count = (pendingRead[conv.id] && now - pendingRead[conv.id] < TTL) ? 0 : dbCount;
        return { ...conv, unread_count, unreadCount: unread_count };
      });

  // Purge pendingRead entries older than 5s to avoid lingering flags
      Object.keys(newPending).forEach((k) => {
        if (now - newPending[k] > TTL) delete newPending[k];
      });
      set({ pendingRead: newPending });

      // Calculate total unread count and subtract pending reads to avoid flicker
      const rawTotalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
      const pendingDeduction = Object.keys(newPending).reduce((sum, convId) => {
        if (newPending[convId] && now - newPending[convId] < 5000) {
          return sum + (unreadCounts[convId] || 0);
        }
        return sum;
      }, 0);
      const totalUnread = Math.max(0, rawTotalUnread - pendingDeduction);

      console.debug('[MessageStore] loadConversations got counts', { unreadCounts, pendingRead });
      set({
        conversations: conversationsWithUnread,
        unreadCount: totalUnread,
        loading: false
      });

      console.debug('[MessageStore] loadConversations completed', { totalUnread, conversationsWithUnread });

      return conversationsWithUnread;
    } catch (error) {
      console.error('Error loading conversations:', error);
      set({ error: error.message, loading: false });
      return [];
    }
  },

  /**
   * Load messages for a specific conversation
   */
  loadMessages: async (conversationId) => {
    try {
      set({ loading: true, error: null });
      const messages = await getMessages(conversationId);
      set({ messages, loading: false });
      return messages;
    } catch (error) {
      console.error('Error loading messages:', error);
      set({ error: error.message, loading: false });
      return [];
    }
  },

  /**
   * Send a message
   */
  sendMessage: async (conversationId, senderId, text) => {
    // Guard: prevent concurrent sends
    const { isSending } = get();
    if (isSending) {
      console.warn('[MessageStore] Already sending a message, ignoring duplicate call');
      return null;
    }

    if (!text || !text.trim()) {
      console.warn('[MessageStore] Empty message text, ignoring');
      return null;
    }

    set({ isSending: true, error: null });

    try {
      const message = await sendMessageService(conversationId, senderId, text);

      if (!message) {
        console.error('[MessageStore] sendMessageService returned null');
        set({ isSending: false });
        return null;
      }

      // Optimistically add message to local state
      set((state) => ({
        messages: [...state.messages, message],
      }));

      // Update conversation's updated_at in local state
      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? { ...conv, updated_at: new Date().toISOString() }
            : conv
        ),
      }));

      return message;
    } catch (error) {
      console.error('[MessageStore] Error sending message:', error);
      set({ error: error.message });
      return null;
    } finally {
      set({ isSending: false });
    }
  },

  /**
   * Start or open a conversation with a user
   */
  openConversationWithUser: async (currentUserId, otherUserId, otherUserProfile) => {
    try {
      set({ loading: true, error: null });

      // Get or create conversation
      const conversation = await getOrCreateConversation(currentUserId, otherUserId);

      // Load messages
      const messages = await getMessages(conversation.id);

      // Set current conversation with user profile
      set({
        currentConversation: {
          ...conversation,
          otherUser: otherUserProfile,
        },
        messages,
        messageModalVisible: true,
        conversationModalVisible: false,
        loading: false,
      });

  // Mark messages as read (optimistic flicker prevention)
  console.debug('[MessageStore] openConversationWithUser marking as read', conversation.id, currentUserId);
  // Temporarily suppress global refreshes to avoid incoming subscriptions overwriting optimistic state
  set({ suppressImmediateRefresh: true });
  await markConversationAsRead(conversation.id, currentUserId);
  // Add to pendingRead to suppress flicker while DB updates
  set((state) => ({ pendingRead: { ...state.pendingRead, [conversation.id]: Date.now() } }));
  // Wait for DB to confirm conversation is read
  const confirmed = await waitForConversationRead(conversation.id, currentUserId, 3000, 250);
  if (!confirmed) console.warn('[MessageStore] waitForConversationRead timed out for', conversation.id);
  // Remove pendingRead flag for this conversation once confirmed
  set((state) => {
    const pending = { ...state.pendingRead };
    delete pending[conversation.id];
    return { pendingRead: pending };
  });
  set({ suppressImmediateRefresh: false });

  // Optimistically zero unread_count for this conversation to avoid UI flicker
  console.debug('[MessageStore] set optimistic unread_count=0 for conv', conversation.id);
      set((state) => ({
        conversations: state.conversations.map(conv =>
          conv.id === conversation.id ? { ...conv, unread_count: 0, unreadCount: 0 } : conv
        )
      }));

      // Refresh total unread count from server
      const totalUnread = await getTotalUnreadCount(currentUserId);
      set({ unreadCount: totalUnread });

      return conversation;
    } catch (error) {
      console.error('Error opening conversation:', error);
      set({ error: error.message, loading: false });
      return null;
    }
  },

  /**
   * Open an existing conversation
   */
  // Open an existing conversation and mark its messages as read.
  // Accept currentUserId to ensure immediate read marking (prevents unread flicker).
  openConversation: async (conversation, currentUserId) => {
    try {
      set({ loading: true, error: null });

      const messages = await getMessages(conversation.id);

      set({
        currentConversation: conversation,
        messages,
        messageModalVisible: true,
        conversationModalVisible: false,
        loading: false,
      });

      if (currentUserId) {
  set({ suppressImmediateRefresh: true });
  await markConversationAsRead(conversation.id, currentUserId);
        // Add to pendingRead to suppress flicker
        set((state) => ({ pendingRead: { ...state.pendingRead, [conversation.id]: Date.now() } }));
        const confirmed = await waitForConversationRead(conversation.id, currentUserId, 3000, 250);
        if (!confirmed) console.warn('[MessageStore] waitForConversationRead timed out for', conversation.id);
        set((state) => {
          const pending = { ...state.pendingRead };
          delete pending[conversation.id];
          return { pendingRead: pending };
        });
        set({ suppressImmediateRefresh: false });

        // Optimistically update local conversation unread_count to 0
        set((state) => ({
          conversations: state.conversations.map(conv =>
            conv.id === conversation.id ? { ...conv, unread_count: 0, unreadCount: 0 } : conv
          )
        }));

        const totalUnread = await getTotalUnreadCount(currentUserId);
        set({ unreadCount: totalUnread });
      }
    } catch (error) {
      console.error('Error opening conversation:', error);
      set({ error: error.message, loading: false });
    }
  },

  /**
   * Subscribe to real-time messages for current conversation
   */
  subscribeToMessages: (conversationId, currentUserId) => {
    // Unsubscribe from previous subscription
    const { messageSubscription } = get();
    if (messageSubscription) {
      messageSubscription.unsubscribe();
    }

    // Subscribe to new messages
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new;

          // Only add if not already in state (avoid duplicates)
          set((state) => {
            const exists = state.messages.some((m) => m.id === newMessage.id);
            if (exists) return state;

            return {
              messages: [...state.messages, newMessage],
            };
          });

          // If message from other user, increment unread count (unless conversation is open)
          if (newMessage.sender_id !== currentUserId) {
            // Since conversation is open, mark this message as read immediately
            markConversationAsRead(conversationId, currentUserId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMessage = payload.new;

          // Update message in state
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === updatedMessage.id ? updatedMessage : m
            ),
          }));
        }
      )
      .subscribe();

    set({ messageSubscription: subscription });
    return subscription;
  },

  /**
   * Unsubscribe from messages
   */
  unsubscribeFromMessages: () => {
    const { messageSubscription } = get();
    if (messageSubscription) {
      messageSubscription.unsubscribe();
      set({ messageSubscription: null });
    }
  },

  /**
   * Mark messages as read
   */
  markAsRead: async (conversationId, currentUserId) => {
    try {
      // Update read status for messages not sent by current user
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .not('sender_id', 'eq', currentUserId)
        .eq('is_read', false);

      // Update local state
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.sender_id !== currentUserId ? { ...msg, is_read: true } : msg
        ),
      }));

      // Refresh unread count
      const totalUnread = await getTotalUnreadCount(currentUserId);
      set({ unreadCount: totalUnread });

      // Update conversation unread count to 0
      set((state) => ({
        conversations: state.conversations.map(conv =>
          conv.id === conversationId
            ? { ...conv, unread_count: 0 }
            : conv
        ),
      }));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  },

  /**
   * Refresh total unread count
   */
  refreshUnreadCount: async (userId) => {
    try {
      const totalUnread = await getTotalUnreadCount(userId);
      set({ unreadCount: totalUnread });
      return totalUnread;
    } catch (error) {
      console.error('Error refreshing unread count:', error);
      return 0;
    }
  },

  /**
   * Subscribe to all messages for unread count updates
   */
  subscribeToAllMessages: (userId) => {
    // Subscribe to all message inserts to update unread count
    const subscription = supabase
      .channel('all-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new;
          
          // If message is not from current user, refresh unread count
          if (newMessage.sender_id !== userId) {
            const totalUnread = await getTotalUnreadCount(userId);
            set({ unreadCount: totalUnread });
            
            // Also update conversation list if loaded
            const { conversations, suppressImmediateRefresh } = get();
            if (!suppressImmediateRefresh && conversations.length > 0) {
              await get().loadConversations(userId);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const updatedMessage = payload.new;
          
          // If message was marked as read, refresh unread count
          if (updatedMessage.is_read) {
            const totalUnread = await getTotalUnreadCount(userId);
            set({ unreadCount: totalUnread });
          }
        }
      )
      .subscribe();

    return subscription;
  },

  /**
   * Toggle conversation modal
   */
  toggleConversationModal: () => {
    set((state) => ({
      conversationModalVisible: !state.conversationModalVisible,
      messageModalVisible: false,
    }));
  },

  /**
   * Toggle message modal
   */
  toggleMessageModal: () => {
    set((state) => ({
      messageModalVisible: !state.messageModalVisible,
    }));
  },

  /**
   * Close all modals
   */
  closeAllModals: () => {
    set({
      conversationModalVisible: false,
      messageModalVisible: false,
      currentConversation: null,
    });
  },

  /**
   * Go back from message modal to conversation modal
   */
  backToConversations: async (userId) => {
    get().unsubscribeFromMessages();
    // Suppress immediate refresh in ConversationModal to avoid cached stale reload before DB commit
    set({ suppressImmediateRefresh: true });

    // Preserve current optimistic unread state; just swap modals
    set({
      messageModalVisible: false,
      conversationModalVisible: true,
      currentConversation: null,
      messages: [],
    });

    // Delay reload slightly to allow is_read update to commit and avoid flicker; also clear suppression
    if (userId) {
      setTimeout(() => {
        get().loadConversations(userId).catch(e => console.warn('[MessageStore] reload after back failed', e));
        set({ suppressImmediateRefresh: false });
      }, 350);
    } else {
      // Always clear suppression if no userId
      setTimeout(() => set({ suppressImmediateRefresh: false }), 350);
    }
  },

  /**
   * Get unread count
   */
  getUnreadCount: () => {
    return get().unreadCount;
  },

  /**
   * Reset store
   */
  reset: () => {
    const { messageSubscription } = get();
    if (messageSubscription) {
      messageSubscription.unsubscribe();
    }

    set({
      conversations: [],
      currentConversation: null,
      messages: [],
      unreadCount: 0,
      loading: false,
      isSending: false,
      error: null,
      conversationModalVisible: false,
      messageModalVisible: false,
      messageSubscription: null,
    });
  },
}));

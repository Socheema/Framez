import { create } from 'zustand';
import {
    getMessages,
    getOrCreateConversation,
    getUserConversations,
    sendMessage as sendMessageService,
} from '../utils/messagesService';
import { supabase } from '../utils/supabase';

export const useMessageStore = create((set, get) => ({
  // State
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

  // Actions

  /**
   * Load all conversations for the current user
   */
  loadConversations: async (userId) => {
    try {
      set({ loading: true, error: null });
      const conversations = await getUserConversations(userId);

      // Calculate unread count
      const unread = conversations.reduce((count, conv) => {
        if (conv.last_message && !conv.last_message_read && conv.last_message_sender !== userId) {
          return count + 1;
        }
        return count;
      }, 0);

      set({
        conversations,
        unreadCount: unread,
        loading: false
      });

      return conversations;
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
  openConversation: async (conversation) => {
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

          // If message from other user, increment unread count
          if (newMessage.sender_id !== currentUserId) {
            set((state) => ({
              unreadCount: state.unreadCount + 1,
            }));
          }
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

      // Recalculate unread count
      const { conversations } = get();
      const unread = conversations.reduce((count, conv) => {
        if (conv.id === conversationId) return count;
        if (conv.last_message && !conv.last_message_read && conv.last_message_sender !== currentUserId) {
          return count + 1;
        }
        return count;
      }, 0);

      set({ unreadCount: unread });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
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
  backToConversations: () => {
    get().unsubscribeFromMessages();
    set({
      messageModalVisible: false,
      conversationModalVisible: true,
      currentConversation: null,
      messages: [],
    });
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

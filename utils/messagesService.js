import { clearCache, executeWithCache, executeWithRetry, withTimeout } from './networkUtils';
import { supabase } from './supabase';

/**
 * Get or create conversation between two users
 */
export async function getOrCreateConversation(userId1, userId2) {
  try {
    // Ensure consistent ordering
    const [participantOne, participantTwo] = [userId1, userId2].sort();

    // Check if conversation exists with retry logic
    const existing = await executeWithRetry(async () => {
      const result = await withTimeout(
        supabase
          .from('conversations')
          .select('*')
          .eq('participant_one', participantOne)
          .eq('participant_two', participantTwo)
          .maybeSingle(),
        15000
      );

      if (result.error && result.error.code !== 'PGRST116') throw result.error;
      return result.data;
    });

    if (existing) return existing;

    // Create new conversation with retry
    const newConversation = await executeWithRetry(async () => {
      const result = await withTimeout(
        supabase
          .from('conversations')
          .insert({
            participant_one: participantOne,
            participant_two: participantTwo,
          })
          .select()
          .single(),
        15000
      );

      if (result.error) throw result.error;

      // Clear conversations cache since we created a new one
      clearCache(`conversations_${participantOne}`);
      clearCache(`conversations_${participantTwo}`);

      return result.data;
    });

    return newConversation;
  } catch (error) {
    console.error('Error getting/creating conversation:', error);
    throw error;
  }
}

/**
 * Send a message
 */
export async function sendMessage(conversationId, senderId, text) {
  try {
    const message = await executeWithRetry(async () => {
      const result = await withTimeout(
        supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: senderId,
            text: text.trim(),
          })
          .select()
          .single(),
        15000
      );

      if (result.error) throw result.error;
      return result.data;
    });

    // Update conversation timestamp (fire and forget with retry)
    executeWithRetry(async () => {
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    }).catch(err => console.warn('Failed to update conversation timestamp:', err));

    // Clear messages cache
    clearCache(`messages_${conversationId}`);

    return message;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Get messages for a conversation
 */
export async function getMessages(conversationId) {
  try {
    // Use caching with 2-minute TTL
    return await executeWithCache(
      `messages_${conversationId}`,
      async () => {
        const result = await executeWithRetry(async () => {
          return await withTimeout(
            supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', conversationId)
              .order('created_at', { ascending: true }),
            15000
          );
        });

        if (result.error) throw result.error;
        return result.data || [];
      },
      2 * 60 * 1000 // 2 minutes cache
    );
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

/**
 * Get all conversations for a user with last message info
 * Optimized with parallel queries and retry logic
 */
export async function getUserConversations(userId) {
  try {
    // Use caching with 1-minute TTL for conversations list
    return await executeWithCache(
      `conversations_${userId}`,
      async () => {
        const conversations = await executeWithRetry(async () => {
          const result = await withTimeout(
            supabase
              .from('conversations')
              .select(`
                *,
                participant_one_profile:profiles!conversations_participant_one_fkey(id, username, full_name, avatar_url),
                participant_two_profile:profiles!conversations_participant_two_fkey(id, username, full_name, avatar_url)
              `)
              .or(`participant_one.eq.${userId},participant_two.eq.${userId}`)
              .order('updated_at', { ascending: false }),
            20000 // Longer timeout for complex query
          );

          if (result.error) throw result.error;
          return result.data || [];
        });

        if (!conversations.length) return [];

        // Get conversation IDs for batch queries
        const conversationIds = conversations.map(c => c.id);

        // Batch fetch last messages and unread counts in parallel
        const [lastMessages, unreadCounts] = await Promise.all([
          // Fetch last message for each conversation
          executeWithRetry(async () => {
            const result = await withTimeout(
              supabase
                .from('messages')
                .select('conversation_id, text, created_at, sender_id')
                .in('conversation_id', conversationIds)
                .order('created_at', { ascending: false }),
              15000
            );

            if (result.error) throw result.error;

            // Group by conversation_id and take first (latest)
            const grouped = {};
            (result.data || []).forEach(msg => {
              if (!grouped[msg.conversation_id]) {
                grouped[msg.conversation_id] = msg;
              }
            });
            return grouped;
          }).catch(() => ({})), // Return empty object on error

          // Fetch unread counts
          executeWithRetry(async () => {
            const result = await withTimeout(
              supabase
                .from('messages')
                .select('conversation_id, sender_id')
                .in('conversation_id', conversationIds)
                .eq('read_status', false)
                .not('sender_id', 'eq', userId),
              15000
            );

            if (result.error) throw result.error;

            // Count by conversation_id
            const counts = {};
            (result.data || []).forEach(msg => {
              counts[msg.conversation_id] = (counts[msg.conversation_id] || 0) + 1;
            });
            return counts;
          }).catch(() => ({})), // Return empty object on error
        ]);

        // Enrich conversations with data
        return conversations.map(conversation => {
          const otherUser =
            conversation.participant_one === userId
              ? conversation.participant_two_profile
              : conversation.participant_one_profile;

          return {
            ...conversation,
            lastMessage: lastMessages[conversation.id] || null,
            otherUser,
            unreadCount: unreadCounts[conversation.id] || 0,
          };
        });
      },
      1 * 60 * 1000 // 1 minute cache
    );
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
}

/**
 * Get unread message count for a user
 * Optimized with caching and retry logic
 */
export async function getUnreadCount(userId) {
  try {
    // Use caching with 30-second TTL
    return await executeWithCache(
      `unread_count_${userId}`,
      async () => {
        // Get all conversations with retry
        const conversations = await executeWithRetry(async () => {
          const result = await withTimeout(
            supabase
              .from('conversations')
              .select('id')
              .or(`participant_one.eq.${userId},participant_two.eq.${userId}`),
            10000
          );

          if (result.error) throw result.error;
          return result.data || [];
        });

        if (conversations.length === 0) return 0;

        // Count unread messages across all conversations
        const conversationIds = conversations.map((c) => c.id);

        const count = await executeWithRetry(async () => {
          const result = await withTimeout(
            supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .in('conversation_id', conversationIds)
              .eq('read_status', false)
              .not('sender_id', 'eq', userId),
            10000
          );

          if (result.error) throw result.error;
          return result.count || 0;
        });

        return count;
      },
      30 * 1000 // 30 seconds cache
    );
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Mark conversation messages as read
 */
export async function markConversationAsRead(conversationId, userId) {
  try {
    await executeWithRetry(async () => {
      const result = await withTimeout(
        supabase
          .from('messages')
          .update({ read_status: true, updated_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('read_status', false)
          .not('sender_id', 'eq', userId),
        10000
      );

      if (result.error) throw result.error;
    });

    // Clear unread count cache
    clearCache(`unread_count_${userId}`);

    return true;
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    return false;
  }
}









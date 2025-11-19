import { clearCache } from './networkUtils';
import { supabase } from './supabase';

/**
 * Get total unread message count for user across all conversations
 * @param {string} userId - Current user's ID
 * @returns {Promise<number>} Total unread count
 */
export async function getTotalUnreadCount(userId) {
  try {
    if (!userId) return 0;

    // Get user's conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant_one.eq.${userId},participant_two.eq.${userId}`);

    if (convError) throw convError;
    if (!conversations || conversations.length === 0) return 0;

    const conversationIds = conversations.map(c => c.id);

    // Count unread messages in these conversations
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId) // Not sent by current user
      .eq('is_read', false); // Unread messages

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('[messageHelpers] Error getting total unread count:', error);
    return 0;
  }
}

/**
 * Mark all messages in a conversation as read
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - Current user's ID
 * @returns {Promise<boolean>} Success status
 */
export async function markConversationAsRead(conversationId, userId) {
  try {
    if (!conversationId || !userId) return false;

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId) // Only mark received messages
      .eq('is_read', false); // Only unread messages

    if (error) throw error;

    // Clear related caches for conversation and user's unread count
    try {
      const convRes = await supabase.from('conversations').select('participant_one,participant_two').eq('id', conversationId).maybeSingle();
      if (!convRes.error && convRes.data) {
        const p1 = convRes.data.participant_one;
        const p2 = convRes.data.participant_two;
        clearCache(`conversations_${p1}`);
        clearCache(`conversations_${p2}`);
      }
    } catch (err) {
      console.warn('[messageHelpers] Failed to fetch conv participants for cache clearing', err);
    }

    clearCache(`messages_${conversationId}`);
    clearCache(`unread_count_${userId}`);

    console.log(`[messageHelpers] Marked conversation ${conversationId} as read`);
    return true;
  } catch (error) {
    console.error('[messageHelpers] Error marking conversation as read:', error);
    return false;
  }
}

/**
 * Get unread count for a specific conversation
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - Current user's ID
 * @returns {Promise<number>} Unread count for this conversation
 */
export async function getConversationUnreadCount(conversationId, userId) {
  try {
    if (!conversationId || !userId) return 0;

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId) // Not sent by current user
      .eq('is_read', false); // Unread messages

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('[messageHelpers] Error getting conversation unread count:', error);
    return 0;
  }
}

/**
 * Get unread counts for multiple conversations
 * @param {Array<string>} conversationIds - Array of conversation IDs
 * @param {string} userId - Current user's ID
 * @returns {Promise<Object>} Map of conversationId -> unread count
 */
export async function getMultipleConversationUnreadCounts(conversationIds, userId) {
  try {
    if (!conversationIds || conversationIds.length === 0 || !userId) return {};

    // Get all unread messages for these conversations
    const { data: unreadMessages, error } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    if (!unreadMessages) return {};

    // Count unread messages per conversation
    const counts = {};
    conversationIds.forEach(id => counts[id] = 0);

    unreadMessages.forEach(msg => {
      counts[msg.conversation_id] = (counts[msg.conversation_id] || 0) + 1;
    });

    return counts;
  } catch (error) {
    console.error('[messageHelpers] Error getting multiple conversation unread counts:', error);
    return {};
  }
}

/**
 * Wait until the conversation is confirmed read for the current user.
 * Polls the DB until unread count is zero or timeout reached.
 * @param {string} conversationId
 * @param {string} userId
 * @param {number} timeoutMs
 * @param {number} intervalMs
 */
export async function waitForConversationRead(conversationId, userId, timeoutMs = 3000, intervalMs = 250) {
  try {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const count = await getConversationUnreadCount(conversationId, userId);
      if (!count || count === 0) return true;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    return false;
  } catch (error) {
    console.error('[messageHelpers] waitForConversationRead error:', error);
    return false;
  }
}

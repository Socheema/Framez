import { supabase } from './supabase';

/**
 * Get or create conversation between two users
 */
export async function getOrCreateConversation(userId1, userId2) {
  try {
    // Ensure consistent ordering
    const [participantOne, participantTwo] = [userId1, userId2].sort();

    // Check if conversation exists
    const { data: existing, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('participant_one', participantOne)
      .eq('participant_two', participantTwo)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    if (existing) return existing;

    // Create new conversation
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        participant_one: participantOne,
        participant_two: participantTwo,
      })
      .select()
      .single();

    if (createError) throw createError;
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
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        text: text.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return data;
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
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

/**
 * Get all conversations for a user with last message info
 */
export async function getUserConversations(userId) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant_one_profile:profiles!conversations_participant_one_fkey(id, username, full_name, avatar_url),
        participant_two_profile:profiles!conversations_participant_two_fkey(id, username, full_name, avatar_url)
      `)
      .or(`participant_one.eq.${userId},participant_two.eq.${userId}`)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // For each conversation, get the last message
    const conversationsWithLastMessage = await Promise.all(
      (data || []).map(async (conversation) => {
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Determine the other user
        const otherUser =
          conversation.participant_one === userId
            ? conversation.participant_two_profile
            : conversation.participant_one_profile;

        // Count unread messages
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .eq('read_status', false)
          .neq('sender_id', userId);

        return {
          ...conversation,
          lastMessage: lastMessage || null,
          otherUser,
          unreadCount: unreadCount || 0,
        };
      })
    );

    return conversationsWithLastMessage;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
}

/**
 * Get unread message count for a user
 */
export async function getUnreadCount(userId) {
  try {
    // Get all conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant_one.eq.${userId},participant_two.eq.${userId}`);

    if (convError) throw convError;

    if (!conversations || conversations.length === 0) return 0;

    // Count unread messages across all conversations
    const conversationIds = conversations.map((c) => c.id);

    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .eq('read_status', false)
      .neq('sender_id', userId);

    if (countError) throw countError;

    return count || 0;
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
    const { error } = await supabase
      .from('messages')
      .update({ read_status: true, updated_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('read_status', false)
      .neq('sender_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    return false;
  }
}









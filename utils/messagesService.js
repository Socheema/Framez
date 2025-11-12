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
 * Get all conversations for a user
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
    return data || [];
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
}









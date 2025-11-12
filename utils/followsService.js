import { supabase } from './supabase';

/**
 * Follow a user
 */
export async function followUser(followerId, followingId) {
  try {
    const { data, error } = await supabase
      .from('follows')
      .insert({
        follower_id: followerId,
        following_id: followingId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followerId, followingId) {
  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw error;
  }
}

/**
 * Check if user is following another user
 */
export async function isFollowing(followerId, followingId) {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
}

/**
 * Get follower count
 */
export async function getFollowerCount(userId) {
  try {
    const { count, error } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting follower count:', error);
    return 0;
  }
}

/**
 * Get following count
 */
export async function getFollowingCount(userId) {
  try {
    const { count, error } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting following count:', error);
    return 0;
  }
}

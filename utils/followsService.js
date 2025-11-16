import { clearCache, executeWithCache, executeWithRetry, withTimeout } from './networkUtils';
import { supabase } from './supabase';

/**
 * Follow a user
 */
export async function followUser(followerId, followingId) {
  try {
    const data = await executeWithRetry(async () => {
      const result = await withTimeout(
        supabase
          .from('follows')
          .insert({
            follower_id: followerId,
            following_id: followingId,
          })
          .select()
          .single(),
        10000
      );

      // Handle duplicate follow (unique constraint violation)
      if (result.error) {
        if (result.error.code === '23505') {
          console.log('Already following this user');
          return null; // Return null to indicate already following
        }
        throw result.error;
      }

      return result.data;
    });

    // Clear caches
    clearCache(`following_${followerId}_${followingId}`);
    clearCache(`follower_count_${followingId}`);
    clearCache(`following_count_${followerId}`);

    return { data, error: null };
  } catch (error) {
    console.error('Error following user:', error);
    return { data: null, error };
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followerId, followingId) {
  try {
    await executeWithRetry(async () => {
      const result = await withTimeout(
        supabase
          .from('follows')
          .delete()
          .eq('follower_id', followerId)
          .eq('following_id', followingId),
        10000
      );

      if (result.error) throw result.error;
    });

    // Clear caches
    clearCache(`following_${followerId}_${followingId}`);
    clearCache(`follower_count_${followingId}`);
    clearCache(`following_count_${followerId}`);

    return { data: true, error: null };
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return { data: null, error };
  }
}

/**
 * Check if user is following another user
 */
export async function isFollowing(followerId, followingId) {
  try {
    return await executeWithCache(
      `following_${followerId}_${followingId}`,
      async () => {
        const result = await executeWithRetry(async () => {
          return await withTimeout(
            supabase
              .from('follows')
              .select('id')
              .eq('follower_id', followerId)
              .eq('following_id', followingId)
              .maybeSingle(),
            10000
          );
        });

        if (result.error && result.error.code !== 'PGRST116') throw result.error;
        return !!result.data;
      },
      30 * 1000 // 30 seconds cache
    );
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
    return await executeWithCache(
      `follower_count_${userId}`,
      async () => {
        const result = await executeWithRetry(async () => {
          return await withTimeout(
            supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('following_id', userId),
            10000
          );
        });

        if (result.error) throw result.error;
        return result.count || 0;
      },
      30 * 1000 // 30 seconds cache
    );
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
    return await executeWithCache(
      `following_count_${userId}`,
      async () => {
        const result = await executeWithRetry(async () => {
          return await withTimeout(
            supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('follower_id', userId),
            10000
          );
        });

        if (result.error) throw result.error;
        return result.count || 0;
      },
      30 * 1000 // 30 seconds cache
    );
  } catch (error) {
    console.error('Error getting following count:', error);
    return 0;
  }
}

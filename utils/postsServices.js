import { supabase } from './supabase';
import { executeWithRetry, executeWithCache, clearCache, withTimeout } from './networkUtils';

// ==================== POSTS ====================

/**
 * Fetch all posts with user info, likes, and comments count
 * Optimized with parallel queries, reduced API calls, retry logic, and caching
 */
export async function fetchAllPosts() {
  try {
    // Use caching with 1-minute TTL
    return await executeWithCache(
      'all_posts',
      async () => {
        // Fetch all posts with retry
        const posts = await executeWithRetry(async () => {
          const result = await withTimeout(
            supabase
              .from('posts')
              .select('*')
              .order('created_at', { ascending: false }),
            20000
          );

          if (result.error) throw result.error;
          return result.data || [];
        });

        if (posts.length === 0) {
          return [];
        }

        const postIds = posts.map(p => p.id);
        const userIds = [...new Set(posts.map(post => post.user_id))];

        // Parallel fetch: profiles, likes, and comments at the same time with retry
        const [profilesRes, likesRes, commentsRes] = await Promise.all([
          executeWithRetry(async () => {
            const result = await withTimeout(
              supabase
                .from('profiles')
                .select('id, full_name, username, avatar_url')
                .in('id', userIds),
              15000
            );
            if (result.error) throw result.error;
            return result;
          }).catch(() => ({ data: [] })),
          
          executeWithRetry(async () => {
            const result = await withTimeout(
              supabase
                .from('likes')
                .select('post_id')
                .in('post_id', postIds),
              15000
            );
            if (result.error) throw result.error;
            return result;
          }).catch(() => ({ data: [] })),
          
          executeWithRetry(async () => {
            const result = await withTimeout(
              supabase
                .from('comments')
                .select('post_id')
                .in('post_id', postIds),
              15000
            );
            if (result.error) throw result.error;
            return result;
          }).catch(() => ({ data: [] }))
        ]);

        // Create lookup maps for O(1) access
        const profilesMap = {};
        (profilesRes.data || []).forEach(profile => {
          profilesMap[profile.id] = profile;
        });

        const likesCountMap = {};
        (likesRes.data || []).forEach(like => {
          likesCountMap[like.post_id] = (likesCountMap[like.post_id] || 0) + 1;
        });

        const commentsCountMap = {};
        (commentsRes.data || []).forEach(comment => {
          commentsCountMap[comment.post_id] = (commentsCountMap[comment.post_id] || 0) + 1;
        });

        // Transform data efficiently
        return posts.map(post => {
          const profile = profilesMap[post.user_id];
          return {
            ...post,
            likes_count: likesCountMap[post.id] || 0,
            comments_count: commentsCountMap[post.id] || 0,
            user_name: profile?.username || profile?.full_name || 'Anonymous',
            avatar_url: profile?.avatar_url || null,
          };
        });
      },
      1 * 60 * 1000 // 1 minute cache
    );
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
}

// ==================== LIKES ====================

/**
 * Check if current user has liked a post
 */
export async function hasUserLikedPost(userId, postId) {
  try {
    return await executeWithCache(
      `like_${userId}_${postId}`,
      async () => {
        const result = await executeWithRetry(async () => {
          return await withTimeout(
            supabase
              .from('likes')
              .select('id')
              .eq('user_id', userId)
              .eq('post_id', postId)
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
    console.error('Error checking like status:', error);
    return false;
  }
}

/**
 * Like a post
 */
export async function likePost(userId, postId) {
  try {
    const data = await executeWithRetry(async () => {
      const result = await withTimeout(
        supabase
          .from('likes')
          .insert({
            user_id: userId,
            post_id: postId,
          })
          .select()
          .single(),
        10000
      );

      if (result.error) {
        if (result.error.code === '23505') {
          console.log('Post already liked');
          return null;
        }
        throw result.error;
      }
      return result.data;
    });

    // Clear caches
    clearCache(`like_${userId}_${postId}`);
    clearCache('all_posts');

    return data;
  } catch (error) {
    console.error('Error liking post:', error);
    throw error;
  }
}

/**
 * Unlike a post
 */
export async function unlikePost(userId, postId) {
  try {
    await executeWithRetry(async () => {
      const result = await withTimeout(
        supabase
          .from('likes')
          .delete()
          .eq('user_id', userId)
          .eq('post_id', postId),
        10000
      );

      if (result.error) throw result.error;
    });

    // Clear caches
    clearCache(`like_${userId}_${postId}`);
    clearCache('all_posts');

    return true;
  } catch (error) {
    console.error('Error unliking post:', error);
    throw error;
  }
}

/**
 * Get likes count for a post
 */
export async function getPostLikesCount(postId) {
  try {
    return await executeWithCache(
      `likes_count_${postId}`,
      async () => {
        const result = await executeWithRetry(async () => {
          return await withTimeout(
            supabase
              .from('likes')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', postId),
            10000
          );
        });

        if (result.error) throw result.error;
        return result.count || 0;
      },
      30 * 1000 // 30 seconds cache
    );
  } catch (error) {
    console.error('Error getting likes count:', error);
    return 0;
  }
}

// ==================== COMMENTS ====================

/**
 * Fetch comments for a post
 * Optimized with parallel queries and retry logic
 */
export async function fetchPostComments(postId) {
  try {
    // Use caching with 1-minute TTL
    return await executeWithCache(
      `comments_${postId}`,
      async () => {
        // Fetch comments with retry
        const comments = await executeWithRetry(async () => {
          const result = await withTimeout(
            supabase
              .from('comments')
              .select('*')
              .eq('post_id', postId)
              .order('created_at', { ascending: true }),
            15000
          );

          if (result.error) throw result.error;
          return result.data || [];
        });

        if (comments.length === 0) {
          return [];
        }

        // Get unique user IDs
        const userIds = [...new Set(comments.map(comment => comment.user_id))];

        // Fetch user profiles with retry
        const profiles = await executeWithRetry(async () => {
          const result = await withTimeout(
            supabase
              .from('profiles')
              .select('id, full_name, username, avatar_url')
              .in('id', userIds),
            15000
          );

          if (result.error) throw result.error;
          return result.data || [];
        }).catch(() => []);

        // Create a map of user profiles for O(1) lookup
        const profilesMap = {};
        profiles.forEach(profile => {
          profilesMap[profile.id] = profile;
        });

        return comments.map(comment => {
          const profile = profilesMap[comment.user_id];
          return {
            ...comment,
            user_name: profile?.username || profile?.full_name || 'Anonymous',
            avatar_url: profile?.avatar_url || null,
          };
        });
      },
      1 * 60 * 1000 // 1 minute cache
    );
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
}

/**
 * Add a comment to a post
 */
export async function addComment(userId, postId, text) {
  try {
    // Insert comment with retry
    const comment = await executeWithRetry(async () => {
      const result = await withTimeout(
        supabase
          .from('comments')
          .insert({
            user_id: userId,
            post_id: postId,
            text: text.trim(),
          })
          .select()
          .single(),
        10000
      );

      if (result.error) throw result.error;
      return result.data;
    });

    // Fetch user profile with retry
    const profile = await executeWithRetry(async () => {
      const result = await withTimeout(
        supabase
          .from('profiles')
          .select('full_name, username, avatar_url')
          .eq('id', userId)
          .single(),
        10000
      );

      if (result.error) throw result.error;
      return result.data;
    }).catch(() => null);

    // Clear caches
    clearCache(`comments_${postId}`);
    clearCache('all_posts');

    return {
      ...comment,
      user_name: profile?.username || profile?.full_name || 'Anonymous',
      avatar_url: profile?.avatar_url || null,
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId, userId) {
  try {
    await executeWithRetry(async () => {
      const result = await withTimeout(
        supabase
          .from('comments')
          .delete()
          .eq('id', commentId)
          .eq('user_id', userId),
        10000
      );

      if (result.error) throw result.error;
    });

    // Clear all posts cache since we don't know which post this comment belongs to
    clearCache('all_posts');

    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

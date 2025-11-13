import { supabase } from './supabase';

// ==================== POSTS ====================

/**
 * Fetch all posts with user info, likes, and comments count
 * Optimized with parallel queries and reduced API calls
 */
export async function fetchAllPosts() {
  try {
    // Fetch all posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Fetch posts error:', postsError);
      throw postsError;
    }

    if (!posts || posts.length === 0) {
      return [];
    }

    const postIds = posts.map(p => p.id);
    const userIds = [...new Set(posts.map(post => post.user_id))];

    // Parallel fetch: profiles, likes, and comments at the same time
    const [profilesRes, likesRes, commentsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', userIds),
      supabase
        .from('likes')
        .select('post_id')
        .in('post_id', postIds),
      supabase
        .from('comments')
        .select('post_id')
        .in('post_id', postIds)
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
    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
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
    const { data, error } = await supabase
      .from('likes')
      .insert({
        user_id: userId,
        post_id: postId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    if (error.code === '23505') {
      console.log('Post already liked');
      return null;
    }
    console.error('Error liking post:', error);
    throw error;
  }
}

/**
 * Unlike a post
 */
export async function unlikePost(userId, postId) {
  try {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);

    if (error) throw error;
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
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting likes count:', error);
    return 0;
  }
}

// ==================== COMMENTS ====================

/**
 * Fetch comments for a post
 * Optimized with parallel queries
 */
export async function fetchPostComments(postId) {
  try {
    // Fetch comments
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (commentsError) throw commentsError;

    if (!comments || comments.length === 0) {
      return [];
    }

    // Get unique user IDs
    const userIds = [...new Set(comments.map(comment => comment.user_id))];

    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', userIds);

    if (profilesError) {
      console.warn('Fetch profiles error:', profilesError);
    }

    // Create a map of user profiles for O(1) lookup
    const profilesMap = {};
    (profiles || []).forEach(profile => {
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
    // Insert comment
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        user_id: userId,
        post_id: postId,
        text: text.trim(),
      })
      .select()
      .single();

    if (commentError) throw commentError;

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.warn('Fetch profile error:', profileError);
    }

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
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

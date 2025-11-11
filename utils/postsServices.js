import { supabase } from './supabase';

// ==================== POSTS ====================

/**
 * Fetch all posts with user info, likes, and comments count
 * Optimized to use a single query with proper joins
 */
export async function fetchAllPosts() {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey (
          full_name,
          username,
          avatar_url
        ),
        likes (count),
        comments (count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch posts error:', error);
      throw error;
    }

    // Transform data to include counts and user info
    return (data || []).map(post => ({
      ...post,
      likes_count: post.likes?.[0]?.count || 0,
      comments_count: post.comments?.[0]?.count || 0,
      user_name: post.profiles?.username || post.profiles?.full_name || 'Anonymous',
      avatar_url: post.profiles?.avatar_url || null,
    }));
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
 */
export async function fetchPostComments(postId) {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles!comments_user_id_fkey (
          full_name,
          username,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(comment => ({
      ...comment,
      user_name: comment.profiles?.username || comment.profiles?.full_name || 'Anonymous',
      avatar_url: comment.profiles?.avatar_url || null,
    }));
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
    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: userId,
        post_id: postId,
        text: text.trim(),
      })
      .select(`
        *,
        profiles!comments_user_id_fkey (
          full_name,
          username,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      user_name: data.profiles?.username || data.profiles?.full_name || 'Anonymous',
      avatar_url: data.profiles?.avatar_url || null,
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





// import { supabase } from './supabase';

// // ==================== POSTS ====================

// /**
//  * Fetch all posts with user info, likes, and comments count
//  */
// export async function fetchAllPosts() {
//   try {
//     const { data, error } = await supabase
//       .from('posts')
//       .select(`
//         *,
//         profiles:user_id (
//           full_name,
//           username,
//           avatar_url
//         ),
//         likes (count),
//         comments (count)
//       `)
//       .order('created_at', { ascending: false });

//     if (error) throw error;

//     // Transform data to include counts
//     return data.map(post => ({
//       ...post,
//       likes_count: post.likes?.[0]?.count || 0,
//       comments_count: post.comments?.[0]?.count || 0,
//       user_name: post.profiles?.username || post.profiles?.full_name || 'Anonymous',
//       avatar_url: post.profiles?.avatar_url,
//     }));
//   } catch (error) {
//     console.error('Error fetching posts:', error);
//     throw error;
//   }
// }

// // ==================== LIKES ====================

// /**
//  * Check if current user has liked a post
//  */
// export async function hasUserLikedPost(userId, postId) {
//   try {
//     const { data, error } = await supabase
//       .from('likes')
//       .select('id')
//       .eq('user_id', userId)
//       .eq('post_id', postId)
//       .maybeSingle();

//     if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
//     return !!data;
//   } catch (error) {
//     console.error('Error checking like status:', error);
//     return false;
//   }
// }

// /**
//  * Like a post
//  */
// export async function likePost(userId, postId) {
//   try {
//     const { data, error } = await supabase
//       .from('likes')
//       .insert({
//         user_id: userId,
//         post_id: postId,
//       })
//       .select()
//       .single();

//     if (error) throw error;
//     return data;
//   } catch (error) {
//     // Handle duplicate like attempt
//     if (error.code === '23505') {
//       console.log('Post already liked');
//       return null;
//     }
//     console.error('Error liking post:', error);
//     throw error;
//   }
// }

// /**
//  * Unlike a post
//  */
// export async function unlikePost(userId, postId) {
//   try {
//     const { error } = await supabase
//       .from('likes')
//       .delete()
//       .eq('user_id', userId)
//       .eq('post_id', postId);

//     if (error) throw error;
//     return true;
//   } catch (error) {
//     console.error('Error unliking post:', error);
//     throw error;
//   }
// }

// /**
//  * Get likes count for a post
//  */
// export async function getPostLikesCount(postId) {
//   try {
//     const { count, error } = await supabase
//       .from('likes')
//       .select('*', { count: 'exact', head: true })
//       .eq('post_id', postId);

//     if (error) throw error;
//     return count || 0;
//   } catch (error) {
//     console.error('Error getting likes count:', error);
//     return 0;
//   }
// }

// // ==================== COMMENTS ====================

// /**
//  * Fetch comments for a post
//  */
// export async function fetchPostComments(postId) {
//   try {
//     const { data, error } = await supabase
//       .from('comments')
//       .select(`
//         *,
//         profiles:user_id (
//           full_name,
//           username,
//           avatar_url
//         )
//       `)
//       .eq('post_id', postId)
//       .order('created_at', { ascending: true });

//     if (error) throw error;

//     return data.map(comment => ({
//       ...comment,
//       user_name: comment.profiles?.username || comment.profiles?.full_name || 'Anonymous',
//       avatar_url: comment.profiles?.avatar_url,
//     }));
//   } catch (error) {
//     console.error('Error fetching comments:', error);
//     throw error;
//   }
// }

// /**
//  * Add a comment to a post
//  */
// export async function addComment(userId, postId, text) {
//   try {
//     const { data, error } = await supabase
//       .from('comments')
//       .insert({
//         user_id: userId,
//         post_id: postId,
//         text: text.trim(),
//       })
//       .select(`
//         *,
//         profiles:user_id (
//           full_name,
//           username,
//           avatar_url
//         )
//       `)
//       .single();

//     if (error) throw error;

//     return {
//       ...data,
//       user_name: data.profiles?.username || data.profiles?.full_name || 'Anonymous',
//       avatar_url: data.profiles?.avatar_url,
//     };
//   } catch (error) {
//     console.error('Error adding comment:', error);
//     throw error;
//   }
// }

// /**
//  * Delete a comment
//  */
// export async function deleteComment(commentId, userId) {
//   try {
//     const { error } = await supabase
//       .from('comments')
//       .delete()
//       .eq('id', commentId)
//       .eq('user_id', userId);

//     if (error) throw error;
//     return true;
//   } catch (error) {
//     console.error('Error deleting comment:', error);
//     throw error;
//   }
// }

import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Button from '../../components/Button';
import CommentsModal from '../../components/CommentsModal';
import ConversationModal from '../../components/ConversationModal';
import FloatingMessageButton from '../../components/FloatingMessageButton';
import MessageModal from '../../components/MessageModal';
import { theme } from '../../constants/theme';
import { hp, wp } from '../../helpers/common';
import { useAuthStore } from '../../stores/auth';
import { useMessageStore } from '../../stores/messageStore';
import { usePostsStore } from '../../stores/postStore';
import { useThemeStore } from '../../stores/themeStore';
import {
    fetchAllPosts,
    getPostLikesCount,
    hasUserLikedPost,
    likePost,
    unlikePost,
} from '../../utils/postsServices';
import { subscribeToMultipleTables } from '../../utils/supabase';

const { width } = Dimensions.get('window');

// Avatar component with fallback to initials - Memoized for performance
const Avatar = React.memo(({ userName, avatarUrl, size = 32, styles }) => {
  const initials = useMemo(() => {
    return userName
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  }, [userName]);

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initials}</Text>
      )}
    </View>
  );
});

// Skeleton loading component - Memoized
const SkeletonLoader = React.memo(({ styles }) => (
  <View style={styles.skeletonContainer}>
    {[1, 2, 3].map((item) => (
      <View key={item} style={styles.skeletonCard}>
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonHeaderText}>
            <View style={styles.skeletonUsername} />
            <View style={styles.skeletonTime} />
          </View>
        </View>
        <View style={styles.skeletonImage} />
        <View style={styles.skeletonCaption} />
        <View style={styles.skeletonCaptionShort} />
      </View>
    ))}
  </View>
));

// Empty state component - Memoized
const EmptyState = React.memo(({ onRefresh, styles }) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyIcon}>📸</Text>
    <Text style={styles.emptyTitle}>No Posts Yet</Text>
    <Text style={styles.emptyText}>
      Posts will appear here once they're created
    </Text>
    <TouchableOpacity style={styles.emptyButton} onPress={onRefresh}>
      <Text style={styles.emptyButtonText}>Refresh</Text>
    </TouchableOpacity>
  </View>
));

// Post card component - Memoized for better performance
const PostCard = React.memo(({ post, currentUserId, onCommentPress, onRefresh, onUserPress, styles }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Use refs to track current state in the callback to avoid stale closures
  const isLikedRef = useRef(false);
  const isLikingRef = useRef(false);

  useEffect(() => {
    checkLikeStatus();
  }, [post.id, currentUserId]);

  const checkLikeStatus = async () => {
    if (currentUserId && post.id) {
      const liked = await hasUserLikedPost(currentUserId, post.id);
      setIsLiked(liked);
      isLikedRef.current = liked;
    }
  };

  const handleLikePress = useCallback(async () => {
    if (!currentUserId) {
      Alert.alert('Login Required', 'Please login to like posts');
      return;
    }

    // Prevent rapid clicks using ref to check current state
    if (isLikingRef.current) return;

    isLikingRef.current = true;
    setIsLiking(true);

    const previousLiked = isLikedRef.current;
    const previousCount = likesCount;
    const newLikedState = !previousLiked;

    // Optimistic update using refs
    isLikedRef.current = newLikedState;
    setIsLiked(newLikedState);
    setLikesCount(prev => previousLiked ? prev - 1 : prev + 1);

    try {
      let result;
      if (previousLiked) {
        // Unlike
        result = await unlikePost(currentUserId, post.id);
      } else {
        // Like
        result = await likePost(currentUserId, post.id);
      }

      // Check for errors with null-safety
      if (result?.error) {
        throw result.error;
      }

      // Refresh count from server to ensure sync
      const newCount = await getPostLikesCount(post.id);
      setLikesCount(newCount);
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      isLikedRef.current = previousLiked;
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      Alert.alert('Error', 'Failed to update like. Please try again.');
    } finally {
      isLikingRef.current = false;
      setIsLiking(false);
    }
  }, [currentUserId, post.id, likesCount]);

  const handleCommentPress = useCallback(() => {
    if (!currentUserId) {
      Alert.alert('Login Required', 'Please login to comment');
      return;
    }
    onCommentPress(post);
  }, [currentUserId, onCommentPress, post]);

  const handleSharePress = useCallback(() => {
    Alert.alert('Share', 'Share functionality coming soon!');
  }, []);

  const handleSavePress = useCallback(() => {
    setIsSaved(!isSaved);
    Alert.alert(
      isSaved ? 'Removed from saved' : 'Saved',
      isSaved ? 'Post removed from your saved collection' : 'Post saved to your collection'
    );
  }, [isSaved]);

  const handleMorePress = useCallback(() => {
    Alert.alert(
      'Post Options',
      'Choose an action',
      [
        { text: 'Report Post', onPress: () => Alert.alert('Report', 'Post reported') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, []);

  const formattedTime = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
    } catch (error) {
      return 'recently';
    }
  }, [post.created_at]);

  return (
    <View style={styles.postCard}>
      {/* Header */}
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.userInfoContainer}
          onPress={() => onUserPress(post.user_id)}
          activeOpacity={0.7}
        >
          <Avatar userName={post.user_name} avatarUrl={post.avatar_url} size={32} styles={styles} />
          <View style={styles.postHeaderText}>
            <Text style={styles.username}>{post.user_name || 'Anonymous'}</Text>
            <Text style={styles.timestamp}>{formattedTime}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreButton} onPress={handleMorePress}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#262626" />
        </TouchableOpacity>
      </View>

      {/* Image */}
      {post.image_url && (
        <Image
          source={{ uri: post.image_url }}
          style={styles.postImage}
          contentFit="cover"
          transition={200}
          placeholder={null}
        />
      )}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <View style={styles.leftActions}>
          {/* Like Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLikePress}
            disabled={isLiking}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={26}
              color={isLiked ? '#ed4956' : '#262626'}
            />
          </TouchableOpacity>

          {/* Comment Button */}
          <TouchableOpacity style={styles.actionButton} onPress={handleCommentPress}>
            <Ionicons name="chatbubble-outline" size={24} color="#262626" />
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity style={styles.actionButton} onPress={handleSharePress}>
            <Ionicons name="paper-plane-outline" size={24} color="#262626" />
          </TouchableOpacity>
        </View>

        {/* Save/Bookmark Button */}
        <TouchableOpacity style={styles.actionButton} onPress={handleSavePress}>
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={24}
            color={isSaved ? '#262626' : '#262626'}
          />
        </TouchableOpacity>
      </View>

      {/* Likes count */}
      {likesCount > 0 && (
        <View style={styles.likesContainer}>
          <Text style={styles.likesText}>
            {likesCount} {likesCount === 1 ? 'like' : 'likes'}
          </Text>
        </View>
      )}

      {/* Caption */}
      {post.caption && (
        <View style={styles.captionContainer}>
          <Text style={styles.caption}>
            <Text style={styles.captionUsername}>{post.user_name} </Text>
            {post.caption}
          </Text>
        </View>
      )}

      {/* Comments count */}
      {post.comments_count > 0 && (
        <TouchableOpacity style={styles.commentsButton} onPress={handleCommentPress}>
          <Text style={styles.commentsText}>
            View all {post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.likes_count === nextProps.post.likes_count &&
    prevProps.post.comments_count === nextProps.post.comments_count &&
    prevProps.currentUserId === nextProps.currentUserId
  );
});

// Main Feed Component
export default function Feed() {
  const router = useRouter();
  const { user, session } = useAuthStore();
  const { theme: currentTheme } = useThemeStore();
  const colors = currentTheme.colors;
  const { posts, setPosts, loading, setLoading } = usePostsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);

  // 🔒 Defensive auth check - redirect if session is lost
  useEffect(() => {
    if (!session) {
      console.log('⚠️ Session lost in feed - redirecting to login');
      router.replace('/login');
    }
  }, [session]);

  // Fetch posts from Supabase - Memoized
  const fetchPosts = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else if (initialLoad) {
        setLoading(true);
      }

      setError(null);

      const data = await fetchAllPosts();
      setPosts(data || []);
      setInitialLoad(false);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err.message || 'Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [initialLoad, setPosts, setLoading]);

  // Initial load only - NO useFocusEffect
  useEffect(() => {
    fetchPosts();
  }, []);

  // ==================== REALTIME SUBSCRIPTIONS ====================
  useEffect(() => {
    // Don't subscribe until we have posts loaded
    if (initialLoad) return;

    console.log('📡 Setting up Realtime subscriptions...');

    const unsubscribe = subscribeToMultipleTables([
      {
        table: 'posts',
        onInsert: async (newPost) => {
          console.log('📝 New post added:', newPost.id);
          // Refresh posts to get the complete post with user info
          await fetchPosts(false);
        },
        onUpdate: (updatedPost) => {
          console.log('✏️ Post updated:', updatedPost.id);
          const currentPosts = usePostsStore.getState().posts;
          if (!Array.isArray(currentPosts)) return;

          const updatedPosts = currentPosts.map(post => {
            if (!post || !post.id) return post;
            return post.id === updatedPost.id
              ? { ...post, ...updatedPost }
              : post;
          }).filter(post => post && post.id);

          setPosts(updatedPosts);
        },
        onDelete: (deletedPost) => {
          console.log('🗑️ Post deleted:', deletedPost.id);
          const currentPosts = usePostsStore.getState().posts;
          if (!Array.isArray(currentPosts)) return;

          const updatedPosts = currentPosts.filter(post =>
            post && post.id && post.id !== deletedPost.id
          );

          setPosts(updatedPosts);
        },
      },
      {
        table: 'likes',
        onInsert: async (newLike) => {
          // ✅ With REPLICA IDENTITY FULL, all columns are guaranteed
          // But keep defensive check as best practice
          if (!newLike?.post_id) {
            console.warn('⚠️ Like insert event missing post_id:', newLike);
            return;
          }

          console.log('❤️ New like on post:', newLike.post_id);
          const currentPosts = usePostsStore.getState().posts;
          if (!Array.isArray(currentPosts)) return;

          const updatedPosts = currentPosts.map(post => {
            if (!post?.id) return post;
            if (post.id === newLike.post_id) {
              return {
                ...post,
                likes_count: (post.likes_count || 0) + 1
              };
            }
            return post;
          }).filter(post => post?.id);

          setPosts(updatedPosts);
        },
        onDelete: (deletedLike) => {
          // ✅ With REPLICA IDENTITY FULL, post_id is now included in delete events
          // Defensive check kept as safety net
          if (!deletedLike?.post_id) {
            console.warn('⚠️ Like delete event missing post_id:', deletedLike);
            return;
          }

          console.log('💔 Like removed from post:', deletedLike.post_id);
          const currentPosts = usePostsStore.getState().posts;
          if (!Array.isArray(currentPosts)) return;

          const updatedPosts = currentPosts.map(post => {
            if (!post?.id) return post;
            if (post.id === deletedLike.post_id) {
              return {
                ...post,
                likes_count: Math.max((post.likes_count || 1) - 1, 0)
              };
            }
            return post;
          }).filter(post => post?.id);

          setPosts(updatedPosts);
        },
      },
      {
        table: 'comments',
        onInsert: (newComment) => {
          // ✅ With REPLICA IDENTITY FULL, all columns are guaranteed
          // But keep defensive check as best practice
          if (!newComment?.post_id) {
            console.warn('⚠️ Comment insert event missing post_id:', newComment);
            return;
          }

          console.log('💬 New comment on post:', newComment.post_id);
          const currentPosts = usePostsStore.getState().posts;
          if (!Array.isArray(currentPosts)) return;

          const updatedPosts = currentPosts.map(post => {
            if (!post?.id) return post;
            if (post.id === newComment.post_id) {
              return {
                ...post,
                comments_count: (post.comments_count || 0) + 1
              };
            }
            return post;
          }).filter(post => post?.id);

          setPosts(updatedPosts);
        },
        onDelete: (deletedComment) => {
          // ✅ With REPLICA IDENTITY FULL, post_id is now included in delete events
          // Defensive check kept as safety net
          if (!deletedComment?.post_id) {
            console.warn('⚠️ Comment delete event missing post_id:', deletedComment);
            return;
          }

          console.log('🗑️ Comment deleted from post:', deletedComment.post_id);
          const currentPosts = usePostsStore.getState().posts;
          if (!Array.isArray(currentPosts)) return;

          const updatedPosts = currentPosts.map(post => {
            if (!post?.id) return post;
            if (post.id === deletedComment.post_id) {
              return {
                ...post,
                comments_count: Math.max((post.comments_count || 1) - 1, 0)
              };
            }
            return post;
          }).filter(post => post?.id);

          setPosts(updatedPosts);
        },
      },
      {
        table: 'profiles',
        onUpdate: (updatedProfile) => {
          console.log('👤 Profile updated:', updatedProfile.id);
          const currentPosts = usePostsStore.getState().posts;
          if (!Array.isArray(currentPosts)) return;

          const updatedPosts = currentPosts.map(post => {
            if (!post || !post.id) return post;
            if (post.user_id === updatedProfile.id) {
              return {
                ...post,
                user_name: updatedProfile.full_name || updatedProfile.username,
                avatar_url: updatedProfile.avatar_url
              };
            }
            return post;
          }).filter(post => post && post.id);

          setPosts(updatedPosts);
        },
      },
    ]);

    // Cleanup subscriptions on unmount
    return () => {
      console.log('🔌 Cleaning up Realtime subscriptions...');
      unsubscribe();
    };
  }, [initialLoad]); // Only re-subscribe if initialLoad changes

  // Pull to refresh
  const onRefresh = useCallback(() => {
    fetchPosts(true);
  }, []);

  // Handle comment press - Memoized
  const handleCommentPress = useCallback((post) => {
    setSelectedPost(post);
    setCommentsModalVisible(true);
  }, []);

  const handleCloseComments = useCallback(() => {
    setCommentsModalVisible(false);
    setSelectedPost(null);
    // Refresh posts to get updated comment count
    fetchPosts(true);
  }, [fetchPosts]);

  // Handle navigation to user profile - Memoized
  const handleUserPress = useCallback((userId) => {
    if (!userId) return;

    // Don't navigate if clicking on own profile
    if (userId === user?.id) {
      Alert.alert('Your Profile', 'Visit the Profile tab to view your profile');
      return;
    }

    router.push(`/userProfile/${userId}`);
  }, [user?.id, router]);

  // Render post item with safety check - Memoized
  const renderPost = useCallback(({ item }) => {
    if (!item || !item.id) {
      console.warn('Skipping invalid post:', item);
      return null;
    }
    return (
      <PostCard
        post={item}
        currentUserId={user?.id}
        onCommentPress={handleCommentPress}
        onRefresh={() => fetchPosts(true)}
        onUserPress={handleUserPress}
        styles={styles}
      />
    );
  }, [user?.id, handleCommentPress, fetchPosts, handleUserPress]);

  // Key extractor with safety check - Memoized
  const keyExtractor = useCallback((item) => {
    if (!item || !item.id) {
      console.warn('Invalid item in posts array:', item);
      return `invalid-${Math.random()}`;
    }
    return item.id.toString();
  }, []);

  // Filtered posts - Memoized
  const filteredPosts = useMemo(() => {
    return Array.isArray(posts) ? posts.filter(post => post && post.id) : [];
  }, [posts]);

  const messageStore = useMessageStore();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: wp(4),
      paddingTop: Platform.OS === 'ios' ? hp(8) : hp(3),
      paddingBottom: hp(1.5),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    headerTitle: {
      fontSize: hp(3),
      fontWeight: theme.fonts.bold,
      color: colors.text,
    },
    listContent: {
      paddingBottom: hp(2),
      backgroundColor: colors.background,
    },
    listContentEmpty: {
      flexGrow: 1,
      backgroundColor: colors.background,
    },

    // Post Card
    postCard: {
      marginBottom: hp(2),
      backgroundColor: colors.surface,
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: wp(3),
      paddingVertical: hp(1.2),
      backgroundColor: colors.surface,
    },
    userInfoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatar: {
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: '#fff',
      fontWeight: theme.fonts.semibold,
    },
    postHeaderText: {
      flex: 1,
      marginLeft: wp(2.5),
    },
    username: {
      fontSize: hp(1.8),
      fontWeight: theme.fonts.semibold,
      color: colors.text,
    },
    timestamp: {
      fontSize: hp(1.5),
      color: colors.textLight,
      marginTop: hp(0.3),
    },
    moreButton: {
      padding: wp(2),
    },
    postImage: {
      width: width,
      height: width,
      backgroundColor: colors.surfaceLight,
    },
    actionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: wp(3),
      paddingTop: hp(1.5),
      paddingBottom: hp(1),
      backgroundColor: colors.surface,
    },
    leftActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      marginRight: wp(3),
    },
    postContent: {
      paddingHorizontal: wp(3),
      paddingBottom: hp(1.5),
      backgroundColor: colors.surface,
    },
    likesContainer: {
      paddingHorizontal: wp(3),
      paddingBottom: hp(0.5),
      backgroundColor: colors.surface,
    },
    likesText: {
      fontSize: hp(1.7),
      fontWeight: theme.fonts.semibold,
      color: colors.text,
      marginBottom: hp(0.7),
    },
    captionContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: wp(3),
      paddingBottom: hp(0.5),
      backgroundColor: colors.surface,
    },
    usernameCaption: {
      fontSize: hp(1.7),
      fontWeight: theme.fonts.semibold,
      color: colors.text,
      marginRight: wp(1),
    },
    // alias to match usage in JSX
    captionUsername: {
      fontSize: hp(1.7),
      fontWeight: theme.fonts.semibold,
      color: colors.text,
      marginRight: wp(1),
    },
    caption: {
      fontSize: hp(1.7),
      color: colors.text,
      flex: 1,
    },
    viewCommentsButton: {
      marginTop: hp(0.8),
    },
    viewCommentsText: {
      fontSize: hp(1.6),
      color: colors.textLight,
    },
    // aliases used in JSX
    commentsButton: {
      paddingHorizontal: wp(3),
      paddingVertical: hp(1),
      backgroundColor: colors.surface,
    },
    commentsText: {
      fontSize: hp(1.6),
      color: colors.textLight,
    },

    // Loading and Empty States
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: wp(8),
      backgroundColor: colors.background,
    },
    emptyTitle: {
      fontSize: hp(2.7),
      fontWeight: theme.fonts.semibold,
      color: colors.text,
      marginTop: hp(2),
      marginBottom: hp(1),
    },
    emptyText: {
      fontSize: hp(1.8),
      color: colors.textLight,
      textAlign: 'center',
      lineHeight: hp(2.5),
      marginBottom: hp(3),
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: wp(8),
      backgroundColor: colors.background,
    },
    errorTitle: {
      fontSize: hp(2.7),
      fontWeight: theme.fonts.semibold,
      color: colors.text,
      marginTop: hp(2),
      marginBottom: hp(1),
    },
    errorText: {
      fontSize: hp(1.8),
      color: colors.textLight,
      textAlign: 'center',
      lineHeight: hp(2.5),
      marginBottom: hp(3),
    },
    errorIcon: {
      fontSize: hp(6),
      marginBottom: hp(1),
    },

    // Skeleton Loader
    skeletonContainer: {
      padding: wp(3),
      backgroundColor: colors.background,
    },
    skeletonCard: {
      marginBottom: hp(2),
      backgroundColor: colors.surface,
    },
    skeletonHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: wp(3),
      paddingVertical: hp(1.2),
    },
    skeletonAvatar: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 999,
    },
    skeletonTextContainer: {
      flex: 1,
      marginLeft: wp(2.5),
    },
    skeletonText: {
      height: hp(1.8),
      backgroundColor: colors.surfaceLight,
      borderRadius: theme.radius.sm,
      marginBottom: hp(0.8),
    },
    skeletonImage: {
      width: width,
      height: width,
      backgroundColor: colors.surfaceLight,
    },
    skeletonActions: {
      flexDirection: 'row',
      paddingHorizontal: wp(3),
      paddingVertical: hp(1.5),
      gap: wp(3),
    },
    skeletonIcon: {
      width: wp(6),
      height: wp(6),
      backgroundColor: colors.surfaceLight,
      borderRadius: theme.radius.sm,
    },
  });

  // Error state
  if (error && !refreshing && posts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Feed</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>

            <Button
          title="Retry Again"
          buttonStyle={{ marginHorizontal: wp(20), paddingHorizontal:wp(5) }}
           onPress={() => fetchPosts()}
        />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header - REMOVED ICONS since tabs handle navigation */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed</Text>
      </View>

      {/* Loading skeleton */}
      {loading && initialLoad ? (
  <SkeletonLoader styles={styles} />
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={renderPost}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            filteredPosts.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#000"
              colors={['#000']}
            />
          }
          ListEmptyComponent={<EmptyState onRefresh={onRefresh} styles={styles} />}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          windowSize={10}
        />
      )}

      {/* Floating Message Button */}
      <FloatingMessageButton />

      {/* Comments Modal */}
      <CommentsModal
        visible={commentsModalVisible}
        onClose={handleCloseComments}
        postId={selectedPost?.id}
        initialCount={selectedPost?.comments_count || 0}
      />

      {/* Conversation Modal */}
      <ConversationModal
        visible={messageStore.conversationModalVisible}
        onClose={() => messageStore.toggleConversationModal()}
      />

      {/* Message Modal */}
      <MessageModal
        visible={messageStore.messageModalVisible}
        onClose={() => messageStore.closeAllModals()}
      />
    </View>
  );
}

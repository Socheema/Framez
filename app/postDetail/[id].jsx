import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../../constants/theme';
import { hp, wp } from '../../helpers/common';
import { useAuthStore } from '../../stores/auth';
import { addComment, fetchPostComments } from '../../utils/postsServices';
import { subscribeToMultipleTables, supabase } from '../../utils/supabase';

// Avatar component
const Avatar = ({ userName, avatarUrl, size = 32 }) => {
  const initials = userName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initials}</Text>
        </View>
      )}
    </View>
  );
};

// Comment item component
const CommentItem = ({ comment, onUserPress }) => {
  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  return (
    <View style={styles.commentItem}>
      <TouchableOpacity onPress={() => onUserPress(comment.user_id)} activeOpacity={0.7}>
        <Avatar userName={comment.user_name} avatarUrl={comment.avatar_url} size={32} />
      </TouchableOpacity>
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <TouchableOpacity onPress={() => onUserPress(comment.user_id)} activeOpacity={0.7}>
            <Text style={styles.commentUsername}>{comment.user_name}</Text>
          </TouchableOpacity>
          <Text style={styles.commentTime}>{formatTime(comment.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{comment.comment || comment.text}</Text>
      </View>
    </View>
  );
};

export default function PostDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likedUsers, setLikedUsers] = useState([]);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Use refs to track current state and prevent rapid clicks
  const isLikedRef = useRef(false);
  const isLikingRef = useRef(false);

  useEffect(() => {
    if (id) {
      loadPostDetails();
      loadComments();
      checkLikeStatus();
      loadLikedUsers();
    }
  }, [id]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!id) return;

    const unsubscribe = subscribeToMultipleTables([
      // Listen for new comments on this post
      {
        table: 'comments',
        onInsert: async (newComment) => {
          if (newComment.post_id === id) {
            // Fetch the comment with user data
            await loadComments();
          }
        },
        onDelete: (deletedComment) => {
          if (deletedComment.post_id === id) {
            setComments((prev) => prev.filter((c) => c.id !== deletedComment.id));
          }
        },
      },
      // Listen for likes/unlikes on this post
      {
        table: 'likes',
        onInsert: async (newLike) => {
          if (newLike.post_id === id) {
            setLikesCount((prev) => prev + 1);
            await loadLikedUsers();
          }
        },
        onDelete: async (deletedLike) => {
          if (deletedLike.post_id === id) {
            setLikesCount((prev) => Math.max(0, prev - 1));
            await loadLikedUsers();
          }
        },
      },
      // Listen for profile updates
      {
        table: 'profiles',
        onUpdate: (updatedProfile) => {
          // Update post author info if it's their profile
          if (post && post.user_id === updatedProfile.id) {
            setPost((prev) => ({
              ...prev,
              user_name: updatedProfile.full_name || updatedProfile.username,
              avatar_url: updatedProfile.avatar_url,
            }));
          }

          // Update comments if any commenter's profile was updated
          setComments((prev) =>
            prev.map((comment) =>
              comment.user_id === updatedProfile.id
                ? {
                    ...comment,
                    user_name: updatedProfile.full_name || updatedProfile.username,
                    avatar_url: updatedProfile.avatar_url,
                  }
                : comment
            )
          );

          // Update liked users list
          setLikedUsers((prev) =>
            prev.map((likedUser) =>
              likedUser.id === updatedProfile.id
                ? {
                    ...likedUser,
                    full_name: updatedProfile.full_name,
                    username: updatedProfile.username,
                    avatar_url: updatedProfile.avatar_url,
                  }
                : likedUser
            )
          );
        },
      },
    ]);

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribe();
    };
  }, [id, post]);

  const loadPostDetails = async () => {
    try {
      setLoading(true);

      // Fetch post
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id);

      if (postError) throw postError;

      if (!postData || postData.length === 0) {
        Alert.alert('Error', 'Post not found');
        router.back();
        return;
      }

      const postItem = postData[0];

      // Fetch post author's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, username, avatar_url')
        .eq('id', postItem.user_id);

      if (profileError) {
        console.warn('Fetch profile error:', profileError);
      }

      const userProfile = profile && profile.length > 0 ? profile[0] : null;

      setPost({
        ...postItem,
        user_name: userProfile?.full_name || userProfile?.username || 'Anonymous',
        avatar_url: userProfile?.avatar_url || null,
      });

      // Get likes count
      const { count, error: likesError } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', id);

      if (likesError) {
        console.warn('Fetch likes count error:', likesError);
      }

      setLikesCount(count || 0);
    } catch (error) {
      console.error('Error loading post:', error);
      Alert.alert('Error', 'Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const commentsWithUsers = await fetchPostComments(id);
      setComments(commentsWithUsers);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const loadLikedUsers = async () => {
    try {
      // Fetch likes with user IDs
      const { data: likes, error: likesError } = await supabase
        .from('likes')
        .select('user_id')
        .eq('post_id', id);

      if (likesError) throw likesError;

      if (!likes || likes.length === 0) {
        setLikedUsers([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(likes.map((like) => like.user_id))];

      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      setLikedUsers(profiles || []);
    } catch (error) {
      console.error('Error loading liked users:', error);
    }
  };

  const checkLikeStatus = async () => {
    if (!user?.id || !id) return;

    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', id);

      if (error) throw error;
      const liked = data && data.length > 0;
      setIsLiked(liked);
      isLikedRef.current = liked;
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const handleLike = async () => {
    if (!user?.id) {
      Alert.alert('Login Required', 'Please login to like posts');
      return;
    }

    // Prevent rapid clicks using ref to check current state
    if (isLikingRef.current) return;

    isLikingRef.current = true;
    const previousLiked = isLikedRef.current;
    const previousCount = likesCount;
    const newLikedState = !previousLiked;

    try {
      if (previousLiked) {
        // Unlike - remove the like
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', id);

        if (error) throw error;

        // Update state to reflect unlike
        isLikedRef.current = false;
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));

        // Update liked users list immediately
        setLikedUsers(prev => prev.filter(likedUser => likedUser.id !== user.id));
      } else {
        // Like - add a new like
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            post_id: id,
          });

        // Handle duplicate like error (23505 is unique constraint violation)
        if (error) {
          if (error.code === '23505') {
            // Like already exists, just update UI to reflect reality
            console.log('Like already exists, updating UI state');
            isLikedRef.current = true;
            setIsLiked(true);
            await loadLikedUsers();
            isLikingRef.current = false;
            return;
          }
          throw error;
        }

        // Update state to reflect like
        isLikedRef.current = true;
        setIsLiked(true);
        setLikesCount(prev => prev + 1);

        // Add current user to liked users list immediately
        if (user.profile) {
          setLikedUsers(prev => [...prev, {
            id: user.id,
            full_name: user.profile.full_name,
            username: user.profile.username,
            avatar_url: user.profile.avatar_url,
          }]);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like. Please try again.');
      // Revert UI state on error
      isLikedRef.current = previousLiked;
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      await checkLikeStatus();
      await loadLikedUsers();
    } finally {
      isLikingRef.current = false;
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    if (!user?.id) {
      Alert.alert('Login Required', 'Please login to comment');
      return;
    }

    try {
      setSubmittingComment(true);

      // Use the service function which returns comment with user data
      const commentWithUserData = await addComment(user.id, id, newComment.trim());

      // Add new comment to list immediately (optimistic update)
      setComments([...comments, commentWithUserData]);
      setNewComment('');

      // Real-time will also add it, but this provides instant feedback
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUserPress = (userId) => {
    if (!userId) return;

    if (userId === user?.id) {
      // Navigate to own profile tab
      router.replace('/tabs/profile');
    } else {
      // Navigate to user profile
      router.push(`/userProfile/${userId}`);
    }
  };

  const handleLikesPress = () => {
    if (likesCount > 0) {
      setShowLikesModal(true);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Post not found</Text>
          <TouchableOpacity style={styles.errorButton} onPress={handleBack}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Post Header */}
        <TouchableOpacity style={styles.postHeader} onPress={() => handleUserPress(post.user_id)} activeOpacity={0.7}>
          <Avatar userName={post.user_name} avatarUrl={post.avatar_url} size={40} />
          <View style={styles.postHeaderText}>
            <Text style={styles.username}>{post.user_name || 'Anonymous'}</Text>
            <Text style={styles.timestamp}>{formatTime(post.created_at)}</Text>
          </View>
        </TouchableOpacity>

        {/* Post Image */}
        {post.image_url && (
          <Image
            source={{ uri: post.image_url }}
            style={styles.postImage}
            contentFit="cover"
            transition={200}
          />
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <View style={styles.leftActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={28}
                color={isLiked ? '#ed4956' : '#262626'}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={26} color="#262626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Likes Count - Clickable */}
        <TouchableOpacity
          style={styles.likesContainer}
          onPress={handleLikesPress}
          activeOpacity={likesCount > 0 ? 0.7 : 1}
        >
          <Text style={styles.likesText}>
            {likesCount} {likesCount === 1 ? 'like' : 'likes'}
          </Text>
          {likedUsers.length > 0 && likedUsers.length <= 3 && (
            <View style={styles.likesPreview}>
              {likedUsers.slice(0, 3).map((user, index) => (
                <View key={user.id} style={[styles.likeAvatarWrapper, { marginLeft: index > 0 ? -8 : 0 }]}>
                  <Avatar userName={user.full_name || user.username} avatarUrl={user.avatar_url} size={20} />
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>

        {/* Caption */}
        {post.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.captionUsername}>{post.user_name} </Text>
            <Text style={styles.captionText}>{post.caption}</Text>
          </View>
        )}

        {/* Comments */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>
          {comments.length > 0 ? (
            comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} onUserPress={handleUserPress} />
            ))
          ) : (
            <Text style={styles.noComments}>No comments yet. Be the first to comment!</Text>
          )}
        </View>
      </ScrollView>

      {/* Likes Modal */}
      <Modal
        visible={showLikesModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLikesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Likes</Text>
              <TouchableOpacity onPress={() => setShowLikesModal(false)}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={likedUsers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.likedUserItem}
                  onPress={() => {
                    setShowLikesModal(false);
                    handleUserPress(item.id);
                  }}
                  activeOpacity={0.7}
                >
                  <Avatar userName={item.full_name || item.username} avatarUrl={item.avatar_url} size={40} />
                  <View style={styles.likedUserInfo}>
                    <Text style={styles.likedUserName}>{item.full_name || item.username}</Text>
                    {item.username && item.full_name && (
                      <Text style={styles.likedUserUsername}>@{item.username}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.noComments}>No likes yet</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Comment Input */}
      <View style={styles.commentInputContainer}>
        <Avatar
          userName={user?.profile?.full_name || user?.profile?.username || user?.email}
          avatarUrl={user?.profile?.avatar_url}
          size={32}
        />
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor={theme.colors.textLight}
          value={newComment}
          onChangeText={setNewComment}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSubmitComment}
          disabled={!newComment.trim() || submittingComment}
        >
          {submittingComment ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Ionicons
              name="send"
              size={24}
              color={newComment.trim() ? theme.colors.primary : theme.colors.textLight}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingTop: hp(6),
    paddingBottom: hp(2),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: hp(2.2),
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
  },
  headerRight: {
    width: 44,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(8),
  },
  errorText: {
    fontSize: hp(2),
    color: theme.colors.text,
    marginBottom: hp(2),
  },
  errorButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: wp(8),
    paddingVertical: hp(1.5),
    borderRadius: theme.radius.md,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: hp(1.8),
    fontWeight: theme.fonts.semibold,
  },
  scrollView: {
    flex: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
  },
  avatar: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallback: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: theme.fonts.bold,
  },
  postHeaderText: {
    flex: 1,
    marginLeft: wp(3),
  },
  username: {
    fontSize: hp(1.9),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },
  timestamp: {
    fontSize: hp(1.4),
    color: theme.colors.textLight,
    marginTop: 2,
  },
  postImage: {
    width: '100%',
    height: wp(100),
    backgroundColor: '#f0f0f0',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: wp(4),
    padding: wp(1),
  },
  likesContainer: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(1),
    flexDirection: 'row',
    alignItems: 'center',
  },
  likesText: {
    fontSize: hp(1.7),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },
  likesPreview: {
    flexDirection: 'row',
    marginLeft: wp(2),
    alignItems: 'center',
  },
  likeAvatarWrapper: {
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 10,
  },
  captionContainer: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(2),
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  captionUsername: {
    fontSize: hp(1.7),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },
  captionText: {
    fontSize: hp(1.7),
    color: theme.colors.text,
    lineHeight: hp(2.4),
  },
  commentsSection: {
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
    paddingBottom: hp(10),
  },
  commentsTitle: {
    fontSize: hp(1.9),
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: hp(2),
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: hp(2),
  },
  commentContent: {
    flex: 1,
    marginLeft: wp(3),
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: hp(1.6),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
    marginRight: wp(2),
  },
  commentTime: {
    fontSize: hp(1.4),
    color: theme.colors.textLight,
  },
  commentText: {
    fontSize: hp(1.6),
    color: theme.colors.text,
    lineHeight: hp(2.2),
  },
  noComments: {
    fontSize: hp(1.6),
    color: theme.colors.textLight,
    textAlign: 'center',
    paddingVertical: hp(3),
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: '#efefef',
    backgroundColor: '#fff',
  },
  commentInput: {
    flex: 1,
    marginHorizontal: wp(3),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    backgroundColor: '#f0f0f0',
    borderRadius: theme.radius.xl,
    fontSize: hp(1.7),
    color: theme.colors.text,
    maxHeight: hp(10),
  },
  sendButton: {
    padding: wp(2),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: theme.radius.xxl,
    borderTopRightRadius: theme.radius.xxl,
    maxHeight: hp(70),
    paddingBottom: hp(4),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
  },
  modalTitle: {
    fontSize: hp(2.2),
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
  },
  likedUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
  },
  likedUserInfo: {
    marginLeft: wp(3),
    flex: 1,
  },
  likedUserName: {
    fontSize: hp(1.8),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },
  likedUserUsername: {
    fontSize: hp(1.5),
    color: theme.colors.textLight,
    marginTop: 2,
  },
});

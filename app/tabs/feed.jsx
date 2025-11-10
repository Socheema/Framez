import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../../stores/auth';
import {
  fetchAllPosts,
  likePost,
  unlikePost,
  hasUserLikedPost,
  getPostLikesCount
} from '../../utils/postsServices';
import CommentsModal from '../../components/CommentsModal';

const { width } = Dimensions.get('window');

// Avatar component
const Avatar = ({ userName, size = 32 }) => {
  const initials = userName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
};

// Skeleton Loading Component
const SkeletonLoader = () => (
  <View style={styles.skeletonContainer}>
    {[1, 2, 3].map((item) => (
      <View key={item} style={styles.skeletonCard}>
        {/* Header skeleton */}
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonHeaderText}>
            <View style={styles.skeletonUsername} />
            <View style={styles.skeletonTime} />
          </View>
        </View>
        {/* Image skeleton */}
        <View style={styles.skeletonImage} />
        {/* Actions skeleton */}
        <View style={styles.skeletonActions}>
          <View style={styles.skeletonActionIcon} />
          <View style={styles.skeletonActionIcon} />
          <View style={styles.skeletonActionIcon} />
        </View>
        {/* Caption skeleton */}
        <View style={styles.skeletonCaption} />
        <View style={styles.skeletonCaptionShort} />
      </View>
    ))}
  </View>
);

// Post card component with likes and comments
const PostCard = ({ post, onLikeToggle, onCommentPress, currentUserId }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    checkLikeStatus();
  }, [post.id]);

  const checkLikeStatus = async () => {
    if (currentUserId && post.id) {
      const liked = await hasUserLikedPost(currentUserId, post.id);
      setIsLiked(liked);
    }
  };

  const handleLikePress = async () => {
    if (isLiking) return;

    setIsLiking(true);
    const previousLiked = isLiked;
    const previousCount = likesCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      if (isLiked) {
        await unlikePost(currentUserId, post.id);
      } else {
        await likePost(currentUserId, post.id);
      }

      // Refresh count from server
      const newCount = await getPostLikesCount(post.id);
      setLikesCount(newCount);
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
    } finally {
      setIsLiking(false);
    }
  };

  const formatTime = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return 'recently';
    }
  };

  return (
    <View style={styles.postCard}>
      {/* Header */}
      <View style={styles.postHeader}>
        <Avatar userName={post.user_name} size={32} />
        <View style={styles.postHeaderText}>
          <Text style={styles.username}>{post.user_name || 'Anonymous'}</Text>
          <Text style={styles.timestamp}>{formatTime(post.created_at)}</Text>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Text style={styles.moreIcon}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Image */}
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
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLikePress}
            disabled={isLiking}
          >
            <Text style={[styles.actionIcon, isLiked && styles.likedIcon]}>
              {isLiked ? '❤️' : '🤍'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onCommentPress(post)}
          >
            <Text style={styles.actionIcon}>💬</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>✈️</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>🔖</Text>
        </TouchableOpacity>
      </View>

      {/* Likes count */}
      {likesCount > 0 && (
        <Text style={styles.likesCount}>
          {likesCount} {likesCount === 1 ? 'like' : 'likes'}
        </Text>
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
        <TouchableOpacity onPress={() => onCommentPress(post)}>
          <Text style={styles.viewComments}>
            View all {post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Empty state component
const EmptyState = ({ onRefresh }) => (
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
);

// Main Feed Component
export default function Feed() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await fetchAllPosts();
      setPosts(data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    loadPosts(true);
  }, []);

  const handleCommentPress = (post) => {
    setSelectedPost(post);
    setCommentsModalVisible(true);
  };

  const handleCloseComments = () => {
    setCommentsModalVisible(false);
    setSelectedPost(null);
    // Refresh to get updated comment count
    loadPosts();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed</Text>
      </View>

      {/* Loading skeleton or Feed */}
      {loading ? (
        <SkeletonLoader />
      ) : (
        <FlatList
          data={posts}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              currentUserId={user?.id}
              onCommentPress={handleCommentPress}
            />
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.listContent,
            posts.length === 0 && styles.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#0095f6"
              colors={['#0095f6']}
            />
          }
          ListEmptyComponent={<EmptyState onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Comments Modal */}
      <CommentsModal
        visible={commentsModalVisible}
        onClose={handleCloseComments}
        postId={selectedPost?.id}
        initialCount={selectedPost?.comments_count || 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  listContent: {
    paddingBottom: 16,
  },
  listContentEmpty: {
    flexGrow: 1,
  },

  // Skeleton Loader Styles
  skeletonContainer: {
    flex: 1,
  },
  skeletonCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  skeletonAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
  },
  skeletonHeaderText: {
    flex: 1,
    marginLeft: 10,
  },
  skeletonUsername: {
    width: 120,
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonTime: {
    width: 80,
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  skeletonImage: {
    width: width,
    height: width,
    backgroundColor: '#e0e0e0',
  },
  skeletonActions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 16,
  },
  skeletonActionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
  },
  skeletonCaption: {
    width: width - 80,
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginHorizontal: 12,
    marginTop: 12,
  },
  skeletonCaptionShort: {
    width: width - 160,
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 8,
  },

  // Post Card
  postCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  avatar: {
    backgroundColor: '#0095f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '600',
  },
  postHeaderText: {
    flex: 1,
    marginLeft: 10,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  moreIcon: {
    fontSize: 20,
    color: '#000',
  },
  postImage: {
    width: width,
    height: width,
    backgroundColor: '#f0f0f0',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  leftActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  actionIcon: {
    fontSize: 24,
  },
  likedIcon: {
    transform: [{ scale: 1.1 }],
  },
  likesCount: {
    paddingHorizontal: 12,
    paddingTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  captionContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  caption: {
    fontSize: 14,
    color: '#000',
    lineHeight: 18,
  },
  captionUsername: {
    fontWeight: '600',
  },
  viewComments: {
    paddingHorizontal: 12,
    paddingTop: 8,
    fontSize: 14,
    color: '#999',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#0095f6',
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

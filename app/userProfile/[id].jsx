import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MessageModal from '../../components/MessageModal';
import { theme } from '../../constants/theme';
import { hp, wp } from '../../helpers/common';
import { useAuthStore } from '../../stores/auth';
import { useFollowStore } from '../../stores/followStore';
import { useMessageStore } from '../../stores/messageStore';
import { subscribeToMultipleTables, supabase } from '../../utils/supabase';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 6) / 3; // 3 columns with 3px gaps

// Avatar component
const Avatar = ({ userName, avatarUrl, size = 80 }) => {
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

// Grid post item component
const GridPostItem = ({ post, onPress }) => (
  <TouchableOpacity
    style={styles.gridItem}
    onPress={() => onPress(post)}
    activeOpacity={0.8}
  >
    {post.image_url ? (
      <Image
        source={{ uri: post.image_url }}
        style={styles.gridImage}
        contentFit="cover"
        transition={200}
      />
    ) : (
      <View style={styles.gridPlaceholder}>
        <Text style={styles.gridPlaceholderText}>No Image</Text>
      </View>
    )}
  </TouchableOpacity>
);

// Empty state component
const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyIcon}>📸</Text>
    <Text style={styles.emptyTitle}>No Posts Yet</Text>
    <Text style={styles.emptyText}>
      This user hasn't posted anything yet
    </Text>
  </View>
);

export default function UserProfile() {
  const { id } = useLocalSearchParams(); // Get user ID from route params
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const followStore = useFollowStore();
  const messageStore = useMessageStore();
  const [userProfile, setUserProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get follow data from store
  const isFollowing = followStore.isFollowing(id);
  const followerCount = followStore.getFollowerCount(id);
  const followingCount = followStore.getFollowingCount(id);

  useEffect(() => {
    if (id) {
      loadUserProfile();
      loadUserPosts();
      loadFollowData();
    }
  }, [id]);

  // Set up real-time subscriptions for follows
  useEffect(() => {
    if (!id) return;

    const unsubscribe = subscribeToMultipleTables([
      {
        table: 'follows',
        onInsert: (newFollow) => {
          // Update counts if this follow involves the current profile
          if (newFollow.following_id === id || newFollow.follower_id === id) {
            followStore.handleFollowInsert(newFollow);
          }
        },
        onDelete: (deletedFollow) => {
          // Update counts if this unfollow involves the current profile
          if (deletedFollow.following_id === id || deletedFollow.follower_id === id) {
            followStore.handleFollowDelete(deletedFollow);
          }
        },
      },
    ]);

    return () => unsubscribe();
  }, [id]);

  const loadFollowData = async () => {
    if (!currentUser?.id || !id) return;

    try {
      await followStore.loadUserFollowData(currentUser.id, id);
    } catch (error) {
      console.error('Error loading follow data:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      setLoading(true);

      if (!id) {
        console.error('No user ID provided');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Check if we got any results
      if (!data || data.length === 0) {
        console.warn('No profile found for user ID:', id);
        setUserProfile(null);
        return;
      }

      setUserProfile(data[0]); // Get first result
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const loadUserPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
      Alert.alert('Error', 'Failed to load user posts');
    } finally {
      setRefreshing(false);
    }
  };

  const handlePostPress = (post) => {
    // Navigate to post detail page
    router.push(`/postDetail/${post.id}`);
  };

  const handleFollowToggle = async () => {
    if (!currentUser?.id) {
      Alert.alert('Login Required', 'Please login to follow users');
      return;
    }

    try {
      if (isFollowing) {
        // Unfollow
        const success = await followStore.unfollowUser(currentUser.id, id);
        if (!success) {
          Alert.alert('Error', 'Failed to unfollow user');
        }
      } else {
        // Follow
        const success = await followStore.followUser(currentUser.id, id);
        if (!success) {
          Alert.alert('Error', 'Failed to follow user');
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Something went wrong');
    }
  };

  const handleMessagePress = async () => {
    if (!currentUser?.id || !userProfile) {
      Alert.alert('Login Required', 'Please login to send messages');
      return;
    }

    // Open message modal with this user
    await messageStore.openConversationWithUser(
      currentUser.id,
      id,
      {
        id: userProfile.id,
        full_name: userProfile.full_name,
        username: userProfile.username,
        avatar_url: userProfile.avatar_url,
      }
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserProfile();
    loadUserPosts();
    loadFollowData();
  };

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.container}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>User not found</Text>
          <TouchableOpacity style={styles.errorButton} onPress={handleBack}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const userName = userProfile.username || userProfile.full_name || userProfile.email?.split('@')[0] || 'User';
  const userEmail = userProfile.email || '';
  const isOwnProfile = currentUser?.id === id;

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{userName}</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        ListHeaderComponent={
          <>
            {/* Profile Info */}
            <View style={styles.profileSection}>
              <Avatar
                userName={userName}
                avatarUrl={userProfile.avatar_url}
                size={80}
              />

              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{posts.length}</Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{followerCount}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{followingCount}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
              </View>
            </View>

            {/* User Details */}
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{userName}</Text>
              {userEmail && <Text style={styles.userEmail}>{userEmail}</Text>}
              {userProfile.bio && (
                <Text style={styles.userBio}>{userProfile.bio}</Text>
              )}
            </View>

            {/* Follow/Message Buttons (only if not own profile) */}
            {!isOwnProfile && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    isFollowing && styles.followingButton
                  ]}
                  onPress={handleFollowToggle}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.followButtonText,
                    isFollowing && styles.followingButtonText
                  ]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.messageButton}
                  onPress={handleMessagePress}
                >
                  <Text style={styles.messageButtonText}>Message</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Posts Grid Header */}
            <View style={styles.gridHeader}>
              <Ionicons name="grid-outline" size={24} color="#000" />
              <Text style={styles.gridHeaderText}>POSTS</Text>
            </View>
          </>
        }
        data={posts}
        renderItem={({ item }) => (
          <GridPostItem post={item} onPress={handlePostPress} />
        )}
        keyExtractor={item => item.id}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState />}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
      />

      {/* Message Modal */}
      <MessageModal
        visible={messageStore.messageModalVisible}
        onClose={() => messageStore.closeAllModals()}
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
    width: 44, // Same width as back button for centering
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
  listContent: {
    paddingBottom: hp(2),
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(3),
  },
  avatar: {
    marginRight: wp(6),
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
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: hp(2.2),
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: hp(1.6),
    color: theme.colors.textLight,
    marginTop: 2,
  },
  userDetails: {
    paddingHorizontal: wp(4),
    marginBottom: hp(2),
  },
  userName: {
    fontSize: hp(2),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: hp(1.6),
    color: theme.colors.textLight,
    marginBottom: 8,
  },
  userBio: {
    fontSize: hp(1.7),
    color: theme.colors.text,
    lineHeight: hp(2.4),
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: wp(4),
    marginBottom: hp(2),
  },
  followButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: hp(1.2),
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    marginRight: wp(1.5),
  },
  followButtonText: {
    color: '#fff',
    fontSize: hp(1.7),
    fontWeight: theme.fonts.semibold,
  },
  followingButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.gray,
  },
  followingButtonText: {
    color: theme.colors.text,
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: hp(1.2),
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.gray,
    alignItems: 'center',
    marginLeft: wp(1.5),
  },
  messageButtonText: {
    color: theme.colors.text,
    fontSize: hp(1.7),
    fontWeight: theme.fonts.semibold,
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: '#efefef',
  },
  gridHeaderText: {
    fontSize: hp(1.6),
    fontWeight: theme.fonts.semibold,
    color: '#000',
    letterSpacing: 1,
    marginLeft: 8,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    marginBottom: 3,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    marginBottom: 3,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridPlaceholderText: {
    fontSize: hp(1.4),
    color: theme.colors.textLight,
  },
  emptyContainer: {
    paddingVertical: hp(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: hp(8),
    marginBottom: hp(2),
  },
  emptyTitle: {
    fontSize: hp(2.2),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
    marginBottom: hp(1),
  },
  emptyText: {
    fontSize: hp(1.8),
    color: theme.colors.textLight,
    textAlign: 'center',
    paddingHorizontal: wp(10),
  },
});

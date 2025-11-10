import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth';
import { supabase } from '../../utils/supabase';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 6) / 3; // 3 columns with 2px gaps

// Avatar component
const Avatar = ({ userName, size = 80 }) => {
  const initials = userName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
};

// Grid post item
const GridPostItem = ({ post, onPress }) => (
  <TouchableOpacity
    style={styles.gridItem}
    onPress={() => onPress(post)}
    activeOpacity={0.9}
  >
    {post.image_url ? (
      <Image
        source={{ uri: post.image_url }}
        style={styles.gridImage}
        resizeMode="cover"
      />
    ) : (
      <View style={styles.gridImagePlaceholder}>
        <Ionicons name="image-outline" size={40} color="#999" />
      </View>
    )}
  </TouchableOpacity>
);

// Empty state
const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <Ionicons name="images-outline" size={80} color="#999" />
    <Text style={styles.emptyTitle}>No Posts Yet</Text>
    <Text style={styles.emptyText}>
      Share your first moment to see it here
    </Text>
  </View>
);

export default function Profile() {
  const router = useRouter();
  const { user, profile, logout } = useAuthStore();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserPosts();
  }, [user]);

  const loadUserPosts = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
      Alert.alert('Error', 'Failed to load your posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const handlePostPress = (post) => {
    // Navigate to post detail or open modal
    Alert.alert('Post', post.caption || 'No caption');
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserPosts();
  };

  const userName = profile?.username || profile?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{userName}</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={28} color="#000" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0095f6" />
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={
            <>
              {/* Profile Info */}
              <View style={styles.profileSection}>
                <Avatar userName={userName} size={80} />

                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{posts.length}</Text>
                    <Text style={styles.statLabel}>Posts</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>0</Text>
                    <Text style={styles.statLabel}>Followers</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>0</Text>
                    <Text style={styles.statLabel}>Following</Text>
                  </View>
                </View>
              </View>

              {/* User Details */}
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{userName}</Text>
                <Text style={styles.userEmail}>{userEmail}</Text>
                {profile?.bio && (
                  <Text style={styles.userBio}>{profile.bio}</Text>
                )}
              </View>

              {/* Edit Profile Button */}
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => Alert.alert('Edit Profile', 'Coming soon!')}
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>

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
      )}
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  logoutButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
  },

  // Profile Section
  profileSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#0095f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  statLabel: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },

  // User Details
  userDetails: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  userBio: {
    fontSize: 14,
    color: '#000',
    lineHeight: 18,
  },

  // Edit Button
  editButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbdbdb',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },

  // Grid Header
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#efefef',
    gap: 8,
  },
  gridHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    letterSpacing: 1,
  },

  // Posts Grid
  gridRow: {
    gap: 2,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    marginBottom: 2,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

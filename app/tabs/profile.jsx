import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../../constants/theme';
import { hp, wp } from '../../helpers/common';
import { useAuthStore } from '../../stores/auth';
import { supabase } from '../../utils/supabase';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 6) / 3; // 3 columns with 2px gaps

// Avatar component with upload capability
const Avatar = ({ userName, avatarUrl, size = 80, onPress, uploading = false }) => {
  const initials = userName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={uploading}
      style={{ position: 'relative' }}
    >
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            resizeMode="cover"
          />
        ) : (
          <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
        )}
        {uploading && (
          <View style={styles.avatarUploadingOverlay}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}
      </View>
      {/* Plus Icon */}
      <View style={[styles.avatarPlusIcon, { width: size * 0.3, height: size * 0.3 }]}>
        <Ionicons name="add" size={size * 0.2} color="#fff" />
      </View>
    </TouchableOpacity>
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
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState(profile?.avatar_url);

  useEffect(() => {
    loadUserPosts();
  }, [user]);

  useEffect(() => {
    // Update local avatar when profile changes
    setLocalAvatarUrl(profile?.avatar_url);
  }, [profile]);

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
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setLogoutModalVisible(false);
    await logout();
    router.replace('/welcome');
  };

  const cancelLogout = () => {
    setLogoutModalVisible(false);
  };

  // Avatar upload functionality
  const handleAvatarPress = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please grant photo library access to update your avatar.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadAvatar = async (imageUri) => {
    if (!user?.id) return;

    try {
      setUploadingAvatar(true);

      // Get file extension
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      let uploadData;

      if (Platform.OS === 'web') {
        // For web: use fetch to get blob
        const response = await fetch(imageUri);
        const blob = await response.blob();
        uploadData = blob;
      } else {
        // For native: use FileSystem + base64-arraybuffer
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        uploadData = decode(base64);
      }

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        try {
          const oldFileName = profile.avatar_url.split('/').pop();
          if (oldFileName) {
            await supabase.storage
              .from('avatars')
              .remove([oldFileName]);
          }
        } catch (error) {
          console.log('No old avatar to delete or error deleting:', error);
        }
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, uploadData, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      // Update local state immediately
      setLocalAvatarUrl(publicUrl);

      // Reload profile from auth store
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (updatedProfile) {
        useAuthStore.setState({ profile: updatedProfile });
      }

      Alert.alert('Success', 'Avatar updated successfully!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', 'Failed to upload avatar. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
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
                <Avatar
                  userName={userName}
                  avatarUrl={localAvatarUrl}
                  size={80}
                  onPress={handleAvatarPress}
                  uploading={uploadingAvatar}
                />

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

      {/* Logout Confirmation Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close Button */}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={cancelLogout}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>

            {/* Modal Icon */}
            <View style={styles.modalIconContainer}>
              <Ionicons name="log-out-outline" size={60} color="#ff3b30" />
            </View>

            {/* Modal Title */}
            <Text style={styles.modalTitle}>Logout</Text>

            {/* Modal Message */}
            <Text style={styles.modalMessage}>
              Are you sure you want to logout?
            </Text>

            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={cancelLogout}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={confirmLogout}
              >
                <Text style={styles.modalConfirmButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: wp(4),
    paddingTop: Platform.OS === 'ios' ? hp(8) : hp(3),
    paddingBottom: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray,
  },
  headerTitle: {
    fontSize: hp(2.5),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },
  logoutButton: {
    padding: wp(1),
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
    paddingHorizontal: wp(4),
    paddingVertical: hp(2.5),
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    color: '#fff',
    fontWeight: theme.fonts.bold,
  },
  avatarUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
  },
  avatarPlusIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: wp(5),
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
    marginTop: hp(0.5),
  },

  // User Details
  userDetails: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(1.5),
  },
  userName: {
    fontSize: hp(2),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
    marginBottom: hp(0.3),
  },
  userEmail: {
    fontSize: hp(1.8),
    color: theme.colors.textLight,
    marginBottom: hp(1),
  },
  userBio: {
    fontSize: hp(1.8),
    color: theme.colors.text,
    lineHeight: hp(2.3),
  },

  // Edit Button
  editButton: {
    marginHorizontal: wp(4),
    marginBottom: hp(2),
    paddingVertical: hp(1),
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.gray,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: hp(1.8),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },

  // Grid Header
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray,
    gap: wp(2),
  },
  gridHeaderText: {
    fontSize: hp(1.5),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
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
    backgroundColor: theme.colors.gray,
  },
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp(8),
    paddingHorizontal: wp(8),
  },
  emptyTitle: {
    fontSize: hp(2.7),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
    marginTop: hp(2),
    marginBottom: hp(1),
  },
  emptyText: {
    fontSize: hp(1.8),
    color: theme.colors.textLight,
    textAlign: 'center',
  },

  // Logout Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(5),
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: theme.radius.xl,
    padding: wp(6),
    width: '100%',
    maxWidth: wp(85),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalCloseButton: {
    position: 'absolute',
    top: hp(1.5),
    right: wp(3),
    padding: wp(2),
    zIndex: 1,
  },
  modalIconContainer: {
    marginTop: hp(1),
    marginBottom: hp(2),
  },
  modalTitle: {
    fontSize: hp(3),
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: hp(1),
  },
  modalMessage: {
    fontSize: hp(2),
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: hp(3),
    lineHeight: hp(2.7),
  },
  modalButtons: {
    flexDirection: 'row',
    gap: wp(3),
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: hp(1.7),
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.gray,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: hp(2),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: hp(1.7),
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.rose,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: hp(2),
    fontWeight: theme.fonts.semibold,
    color: '#fff',
  },
});

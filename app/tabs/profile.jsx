import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import ConversationModal from '../../components/ConversationModal';
import EditProfileModal from '../../components/EditProfileModal';
import FloatingMessageButton from '../../components/FloatingMessageButton';
import MessageModal from '../../components/MessageModal';
import { hp, wp } from '../../helpers/common';
import { useAuthStore } from '../../stores/auth';
import { useFollowStore } from '../../stores/followStore';
import { useMessageStore } from '../../stores/messageStore';
import { useThemeStore } from '../../stores/themeStore';
import { subscribeToMultipleTables, supabase } from '../../utils/supabase';
import { uploadImage } from '../../utils/uploadImage';

const { width } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 6) / 3; // 3 columns with 2px gaps

// Avatar component with upload capability (themed via props)
const Avatar = ({ userName, avatarUrl, size = 80, onPress, uploading = false, colors, theme }) => {
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
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            resizeMode="cover"
          />
        ) : (
          <Text style={{ color: '#fff', fontWeight: theme?.fonts?.bold || '700', fontSize: size * 0.35 }}>{initials}</Text>
        )}
        {uploading && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 999,
          }}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}
      </View>
      {/* Plus Icon */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: size * 0.3,
        height: size * 0.3,
        backgroundColor: colors.primary,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Ionicons name="add" size={size * 0.2} color="#fff" />
      </View>
    </TouchableOpacity>
  );
};

// Grid post item (themed via props)
const GridPostItem = ({ post, onPress, colors }) => {
  const isVideo = /\.mp4$/i.test(post.image_url || '');
  
  return (
    <TouchableOpacity
      style={{ width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE, marginBottom: 2 }}
      onPress={() => onPress(post)}
      activeOpacity={0.9}
    >
      {post.image_url ? (
        <View style={{ width: '100%', height: '100%', position: 'relative' }}>
          <Image
            source={{ uri: post.image_url }}
            style={{ width: '100%', height: '100%', backgroundColor: colors.surfaceLight }}
            resizeMode="cover"
          />
          {isVideo && (
            <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: 4 }}>
              <Ionicons name="videocam" size={16} color="#fff" />
            </View>
          )}
        </View>
      ) : (
        <View style={{ width: '100%', height: '100%', backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="image-outline" size={40} color={colors.textLight} />
        </View>
      )}
    </TouchableOpacity>
  );
};

// Empty state (themed via props)
const EmptyState = ({ colors, theme }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: hp(8), paddingHorizontal: wp(8), backgroundColor: colors.background }}>
    <Ionicons name="images-outline" size={80} color={colors.textLight} />
    <Text style={{ fontSize: hp(2.7), fontWeight: theme?.fonts?.semibold || '600', color: colors.text, marginTop: hp(2), marginBottom: hp(1) }}>No Posts Yet</Text>
    <Text style={{ fontSize: hp(1.8), color: colors.textLight, textAlign: 'center', lineHeight: hp(2.5) }}>
      Share your first moment to see it here
    </Text>
  </View>
);

export default function Profile() {
  const router = useRouter();
  const { user, profile, logout, session } = useAuthStore();
  const followStore = useFollowStore();
  const messageStore = useMessageStore();
  const { theme } = useThemeStore();
  const colors = theme.colors;
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: wp(4), paddingTop: Platform.OS === 'ios' ? hp(8) : hp(3), paddingBottom: hp(1.5), borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { fontSize: hp(2.5), fontWeight: theme.fonts.semibold, color: colors.text },
    logoutButton: { padding: wp(1) },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    listContent: { flexGrow: 1, backgroundColor: colors.background },

    // Profile Section
    profileSection: { flexDirection: 'row', paddingHorizontal: wp(4), paddingVertical: hp(2.5), alignItems: 'center', backgroundColor: colors.background },
    statsContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', marginLeft: wp(5) },
    statItem: { alignItems: 'center' },
    statNumber: { fontSize: hp(2.2), fontWeight: theme.fonts.bold, color: colors.text },
    statLabel: { fontSize: hp(1.6), color: colors.textLight, marginTop: hp(0.5) },

    // User Details
    userDetails: { paddingHorizontal: wp(4), paddingBottom: hp(1.5), backgroundColor: colors.background },
    userName: { fontSize: hp(2), fontWeight: theme.fonts.semibold, color: colors.text, marginBottom: hp(0.3) },
    userEmail: { fontSize: hp(1.8), color: colors.textLight, marginBottom: hp(1) },
    userBio: { fontSize: hp(1.8), color: colors.text, lineHeight: hp(2.3) },

    // Edit Button
    editButton: { marginHorizontal: wp(4), marginBottom: hp(2), paddingVertical: hp(1), borderRadius: theme.radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
    editButtonText: { fontSize: hp(1.8), fontWeight: theme.fonts.semibold },

    // Grid Header
    gridHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: hp(1.5), borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background, gap: wp(2) },
    gridHeaderText: { fontSize: hp(1.5), fontWeight: theme.fonts.semibold, color: colors.text, letterSpacing: 1 },

    // Posts Grid
    gridRow: { gap: 2, backgroundColor: colors.background },

    // Empty State
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: hp(8), paddingHorizontal: wp(8), backgroundColor: colors.background },
    emptyTitle: { fontSize: hp(2.7), fontWeight: theme.fonts.semibold, color: colors.text, marginTop: hp(2), marginBottom: hp(1) },
    emptyText: { fontSize: hp(1.8), color: colors.textLight, textAlign: 'center', lineHeight: hp(2.5) },

    // Logout Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: wp(5) },
    modalContent: { backgroundColor: colors.surface, borderRadius: theme.radius.xl, padding: wp(6), width: '100%', maxWidth: wp(85), alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalCloseButton: { position: 'absolute', top: hp(1.5), right: wp(3), padding: wp(2), zIndex: 1 },
    modalIconContainer: { marginTop: hp(1), marginBottom: hp(2) },
    modalTitle: { fontSize: hp(3), fontWeight: theme.fonts.bold, color: colors.text, marginBottom: hp(1) },
    modalMessage: { fontSize: hp(2), color: colors.textLight, textAlign: 'center', marginBottom: hp(3), lineHeight: hp(2.7) },
    modalButtons: { flexDirection: 'row', gap: wp(3), width: '100%' },
    modalCancelButton: { flex: 1, paddingVertical: hp(1.7), borderRadius: theme.radius.lg, backgroundColor: colors.surfaceLight, alignItems: 'center' },
    modalCancelButtonText: { fontSize: hp(2), fontWeight: theme.fonts.semibold, color: colors.text },
    modalConfirmButton: { flex: 1, paddingVertical: hp(1.7), borderRadius: theme.radius.lg, backgroundColor: theme.colors.rose, alignItems: 'center' },
    modalConfirmButtonText: { fontSize: hp(2), fontWeight: theme.fonts.semibold, color: '#fff' },
  }), [colors, theme]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState(profile?.avatar_url);

  // Get follow counts from store
  const followerCount = user?.id ? followStore.getFollowerCount(user.id) : 0;
  const followingCount = user?.id ? followStore.getFollowingCount(user.id) : 0;

  // 🔒 Defensive auth check - redirect if session is lost
  useEffect(() => {
    if (!session) {
      console.log('⚠️ Session lost in profile - redirecting to login');
      router.replace('/login');
    }
  }, [session]);

  useEffect(() => {
    loadUserPosts();
    loadFollowCounts();
  }, [user]);

  // Set up real-time subscriptions for follows
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToMultipleTables([
      {
        table: 'follows',
        onInsert: (newFollow) => {
          // ✅ With REPLICA IDENTITY FULL, all columns are guaranteed
          if (!newFollow?.following_id || !newFollow?.follower_id) {
            console.warn('⚠️ Follow insert event missing IDs:', newFollow);
            return;
          }

          // Update counts if this follow involves the current user
          if (newFollow.following_id === user.id || newFollow.follower_id === user.id) {
            followStore.handleFollowInsert(newFollow);
          }
        },
        onDelete: (deletedFollow) => {
          // ✅ With REPLICA IDENTITY FULL, IDs are now included in delete events
          if (!deletedFollow?.following_id || !deletedFollow?.follower_id) {
            console.warn('⚠️ Follow delete event missing IDs:', deletedFollow);
            return;
          }

          // Update counts if this unfollow involves the current user
          if (deletedFollow.following_id === user.id || deletedFollow.follower_id === user.id) {
            followStore.handleFollowDelete(deletedFollow);
          }
        },
      },
    ]);

    return () => unsubscribe();
  }, [user?.id]);

  const loadFollowCounts = async () => {
    if (!user?.id) return;

    try {
      await followStore.loadFollowerCount(user.id);
      await followStore.loadFollowingCount(user.id);
    } catch (error) {
      console.error('Error loading follow counts:', error);
    }
  };

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
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      // Check if user canceled or result is invalid
      if (!result || result.canceled || result.cancelled) {
        console.log('User cancelled image picker');
        return;
      }

      if (result.assets?.[0]) {
        await uploadAvatar(result.assets[0]);
      } else if (result.uri) {
        // Fallback for older API versions
        await uploadAvatar({ uri: result.uri, type: result.type });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadAvatar = async (asset) => {
    if (!user?.id) return;

    // Validate asset object
    if (!asset || !asset.uri) {
      console.error('Invalid asset object:', asset);
      Alert.alert('Error', 'Invalid image selected. Please try again.');
      return;
    }

    try {
      setUploadingAvatar(true);
      const imageUri = asset.uri;
      // Derive extension from asset metadata or URI
      let fileExt = 'jpg';
      if (asset.fileName) fileExt = asset.fileName.split('.').pop()?.toLowerCase() || 'jpg';
      else if (asset.type) fileExt = asset.type.split('/').pop()?.toLowerCase() || 'jpg';
      else if (imageUri && imageUri.includes('.')) fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      if (fileExt === 'jpeg') fileExt = 'jpg';
      // Consistent avatar path for upsert overwrite
      const filePath = `${user.id}/avatar.${fileExt}`;
      const publicUrl = await uploadImage(imageUri, 'avatars', filePath);

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
      let msg = 'Failed to upload avatar. ' + (error.message || 'Please try again.');
      Alert.alert('Upload Error', msg);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePostPress = (post) => {
    // Navigate to post detail page
    router.push(`/postDetail/${post.id}`);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUserPosts();
    loadFollowCounts();
  };

  const userName = profile?.username || profile?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{userName}</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={28} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
                  colors={colors}
                  theme={theme}
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
                <Text style={styles.userEmail}>{userEmail}</Text>
                {profile?.bio && (
                  <Text style={styles.userBio}>{profile.bio}</Text>
                )}
              </View>

              {/* Edit Profile Button */}
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setEditProfileModalVisible(true)}
              >
                <Text style={[styles.editButtonText, { color: colors.text }]}>Edit Profile</Text>
              </TouchableOpacity>

              {/* Posts Grid Header */}
              <View style={styles.gridHeader}>
                <Ionicons name="grid-outline" size={24} color={colors.text} />
                <Text style={styles.gridHeaderText}>POSTS</Text>
              </View>
            </>
          }
          data={posts}
          renderItem={({ item }) => (
            <GridPostItem post={item} onPress={handlePostPress} colors={colors} />
          )}
          keyExtractor={item => item.id}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState colors={colors} theme={theme} />}
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

      {/* Floating Message Button */}
      <FloatingMessageButton />

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

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={editProfileModalVisible}
        onClose={() => setEditProfileModalVisible(false)}
      />
    </View>
  );
}


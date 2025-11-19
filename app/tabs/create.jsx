// Removed direct base64/file-system imports; using shared upload utility
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import ConversationModal from '../../components/ConversationModal';
import FloatingMessageButton from '../../components/FloatingMessageButton';
import MessageModal from '../../components/MessageModal';
import { theme } from '../../constants/theme';
import { hp, wp } from '../../helpers/common';
import { useAuthStore } from '../../stores/auth';
import { useMessageStore } from '../../stores/messageStore';
import { usePostsStore } from '../../stores/postStore';
import { useThemeStore } from '../../stores/themeStore';
import { supabase } from '../../utils/supabase';
import { uploadImage } from '../../utils/uploadImage';

export default function CreatePost() {
  const [caption, setCaption] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const addPost = usePostsStore((state) => state.addPost);
  const { user, session } = useAuthStore();
  const messageStore = useMessageStore();
  const { theme: currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  // 🔒 Defensive auth check - redirect if session is lost
  useEffect(() => {
    if (!session) {
      console.log('⚠️ Session lost in create - redirecting to login');
      router.replace('/login');
    }
  }, [session]);

  // Request permissions and pick image
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please grant photo library access to select images.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Handle post creation
  const handlePost = async () => {
    // Validate inputs before starting upload
    if (!selectedImage?.uri) {
      Alert.alert('Missing Image', 'Please select an image to post.');
      return;
    }
    if (!caption.trim()) {
      Alert.alert('Missing Caption', 'Please add a caption to your post.');
      return;
    }

    setLoading(true);

    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        throw new Error('Please sign in to create a post.');
      }

      // Upload image
      if (!selectedImage.uri) {
        throw new Error('Image URI is missing');
      }

      const imageExt = selectedImage.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileExt = imageExt === 'jpeg' ? 'jpg' : imageExt;
      const filePath = `${currentUser.id}/${Date.now()}.${fileExt}`;
      const imageUrl = await uploadImage(selectedImage.uri, 'posts', filePath);

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', currentUser.id)
        .single();

      const userName = profile?.username || profile?.full_name || currentUser.email?.split('@')[0] || 'Anonymous';

      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert([{ user_id: currentUser.id, caption: caption.trim(), image_url: imageUrl }])
        .select()
        .single();

      if (postError) throw postError;

      const transformedPost = {
        ...newPost,
        user_name: userName,
        avatar_url: profile?.avatar_url || null,
        likes_count: 0,
        comments_count: 0,
      };

      addPost(transformedPost);
      setCaption('');
      setSelectedImage(null);
      router.replace('/tabs/feed');
    } catch (error) {
      console.error('Error creating post:', error);
      const message = error?.message || 'Failed to create post. Please try again.';
      Alert.alert('Error Creating Post', message);
    } finally {
      setLoading(false);
    }
  };

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
      paddingTop: Platform.OS === 'ios' ? hp(8) : hp(3) + 16,
      paddingBottom: hp(1.5),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    headerTitle: {
      fontSize: hp(2.2),
      fontWeight: theme.fonts.semibold,
      color: colors.text,
    },
    cancelText: {
      fontSize: hp(2),
      color: colors.textLight,
    },
    postButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: wp(5),
      paddingVertical: hp(1),
      borderRadius: theme.radius.xl,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: wp(20),
    },
    postButtonDisabled: {
      backgroundColor: colors.surfaceLight,
      opacity: 0.6,
    },
    postButtonText: {
      fontSize: hp(2),
      color: '#fff',
      fontWeight: theme.fonts.semibold,
    },
    content: {
      flex: 1,
      backgroundColor: colors.background,
    },
    imagePickerButton: {
      margin: wp(4),
      height: hp(38),
      backgroundColor: colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imagePickerContent: {
      alignItems: 'center',
    },
    imagePickerIcon: {
      fontSize: hp(8),
      marginBottom: hp(1.5),
    },
    imagePickerText: {
      fontSize: hp(2.2),
      fontWeight: theme.fonts.semibold,
      color: colors.text,
      marginBottom: hp(0.5),
    },
    imagePickerSubtext: {
      fontSize: hp(1.8),
      color: colors.textLight,
    },
    imageContainer: {
      margin: wp(4),
    },
    imagePreview: {
      width: '100%',
      height: hp(38),
      borderRadius: theme.radius.lg,
      backgroundColor: colors.surfaceLight,
    },
    changeImageButton: {
      marginTop: hp(1.5),
      paddingVertical: hp(1.2),
      paddingHorizontal: wp(5),
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.xl,
      alignItems: 'center',
    },
    changeImageText: {
      color: '#fff',
      fontSize: hp(2),
      fontWeight: theme.fonts.semibold,
    },
    captionContainer: {
      margin: wp(4),
      marginTop: 0,
    },
    captionInput: {
      fontSize: hp(2),
      color: colors.text,
      minHeight: hp(15),
      padding: wp(4),
      backgroundColor: colors.inputBackground,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    characterCount: {
      fontSize: hp(1.5),
      color: colors.textLight,
      textAlign: 'right',
      marginTop: hp(1),
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: hp(4),
    },
    loadingText: {
      marginTop: hp(1.5),
      fontSize: hp(2),
      color: colors.textLight,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity
          style={[
            styles.postButton,
            loading && styles.postButtonDisabled,
          ]}
          onPress={handlePost}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.postButtonText}>
            {loading ? 'Posting...' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Preview */}
        {selectedImage ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={pickImage}
              disabled={loading}
            >
              <Text style={styles.changeImageText}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.imagePickerButton}
            onPress={pickImage}
            disabled={loading}
          >
            <View style={styles.imagePickerContent}>
              <Text style={styles.imagePickerIcon}>📷</Text>
              <Text style={styles.imagePickerText}>Select Photo</Text>
              <Text style={styles.imagePickerSubtext}>
                Choose from your library
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Caption Input */}
        <View style={styles.captionContainer}>
          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption..."
            placeholderTextColor={colors.textLight}
            value={caption}
            onChangeText={setCaption}
            multiline
            textAlignVertical="top"
            editable={!loading}
            maxLength={2200}
          />
          <Text style={styles.characterCount}>
            {caption.length}/2200
          </Text>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Creating your post...</Text>
          </View>
        )}
      </ScrollView>

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
    </View>
  );
}

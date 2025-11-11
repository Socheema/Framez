import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { useAuthStore } from '../../stores/auth';
import { usePostsStore } from '../../stores/postStore';
import { supabase } from '../../utils/supabase';

export default function CreatePost() {
  const [caption, setCaption] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const addPost = usePostsStore((state) => state.addPost);
  const { user } = useAuthStore();

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

  // Upload image to Supabase Storage
  const uploadImage = async (imageUri) => {
    try {
      console.log('Starting upload for:', imageUri);

      // Get file extension
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      let uploadData;

      if (Platform.OS === 'web') {
        // For web: use fetch to get blob
        console.log('Using web upload method (blob)');
        const response = await fetch(imageUri);
        const blob = await response.blob();
        uploadData = blob;
      } else {
        // For native: use FileSystem + base64-arraybuffer
        console.log('Using native upload method (base64)');
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        // Convert base64 to array buffer
        uploadData = decode(base64);
      }

      console.log('Uploading to Supabase...');

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('posts')
        .upload(filePath, uploadData, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      console.log('Upload successful:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  // Handle post creation
  const handlePost = async () => {
    if (!selectedImage) {
      Alert.alert('Missing Image', 'Please select an image to post.');
      return;
    }

    if (!caption.trim()) {
      Alert.alert('Missing Caption', 'Please add a caption to your post.');
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        throw new Error('Please sign in to create a post.');
      }

      console.log('Creating post for user:', currentUser.id);

      // Upload image first
      console.log('Uploading image...');
      const imageUrl = await uploadImage(selectedImage.uri);
      console.log('Image uploaded:', imageUrl);

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', currentUser.id)
        .single();

      if (profileError) {
        console.log('Profile fetch error:', profileError);
      }

      const userName = profile?.username || profile?.full_name || currentUser.email?.split('@')[0] || 'Anonymous';

      // Create post data
      const postData = {
        user_id: currentUser.id,
        caption: caption.trim(),
        image_url: imageUrl,
      };

      console.log('Inserting post:', postData);

      // Save to Supabase
      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert([postData])
        .select()
        .single();

      if (postError) {
        console.error('Post creation error:', postError);
        throw postError;
      }

      console.log('Post created successfully:', newPost);

      // Transform post to include user info
      const transformedPost = {
        ...newPost,
        user_name: userName,
        avatar_url: profile?.avatar_url || null,
        likes_count: 0,
        comments_count: 0,
      };

      // Add to Zustand store
      addPost(transformedPost);

      // Reset form
      setCaption('');
      setSelectedImage(null);

      // Show success and navigate
      Alert.alert('Success', 'Post created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            router.replace('/tabs/feed');
          },
        },
      ]);

    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create post. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

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
          onPress={handlePost}
          disabled={loading || !selectedImage || !caption.trim()}
        >
          <Text
            style={[
              styles.postText,
              (!selectedImage || !caption.trim() || loading) && styles.postTextDisabled,
            ]}
          >
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
            placeholderTextColor="#999"
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
            <ActivityIndicator size="large" color="#0095f6" />
            <Text style={styles.loadingText}>Creating your post...</Text>
          </View>
        )}
      </ScrollView>
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
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  cancelText: {
    fontSize: 16,
    color: '#000',
  },
  postText: {
    fontSize: 16,
    color: '#0095f6',
    fontWeight: '600',
  },
  postTextDisabled: {
    color: '#b3d9f6',
  },
  content: {
    flex: 1,
  },
  imagePickerButton: {
    margin: 16,
    height: 300,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#efefef',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerContent: {
    alignItems: 'center',
  },
  imagePickerIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  imagePickerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  imagePickerSubtext: {
    fontSize: 14,
    color: '#999',
  },
  imageContainer: {
    margin: 16,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  changeImageButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#0095f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  changeImageText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  captionContainer: {
    margin: 16,
    marginTop: 0,
  },
  captionInput: {
    fontSize: 16,
    color: '#000',
    minHeight: 120,
    padding: 16,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efefef',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
});

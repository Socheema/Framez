import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { create } from 'zustand';
import { supabase } from '../../../utils/supabase';

// Zustand Store for Posts
export const usePostsStore = create((set) => ({
  posts: [],
  addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),
  setPosts: (posts) => set({ posts }),
}));

export default function CreatePost() {
  const [caption, setCaption] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const addPost = usePostsStore((state) => state.addPost);

  // Request permissions and pick image
  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please grant photo library access to select images.'
        );
        return;
      }

      // Launch image picker
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
      const fileExt = imageUri.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      // Convert image to blob for upload
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('post-images')
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600',
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Please sign in to create a post.');
      }

      // Get user profile for username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('id', user.id)
        .single();

      const userName = profile?.username || profile?.full_name || user.email?.split('@')[0] || 'Anonymous';

      // Upload image
      const imageUrl = await uploadImage(selectedImage.uri);

      // Create post data
      const postData = {
        userId: user.id,
        userName: userName,
        text: caption.trim(),
        imageUrl: imageUrl,
        timestamp: new Date().toISOString(),
      };

      // Save to Supabase
      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert([postData])
        .select()
        .single();

      if (postError) throw postError;

      // Add to Zustand store
      addPost(newPost);

      // Show success and navigate
      Alert.alert('Success', 'Post created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setCaption('');
            setSelectedImage(null);
            router.push('/tabs/feed');
          },
        },
      ]);
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', error.message || 'Failed to create post. Please try again.');
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

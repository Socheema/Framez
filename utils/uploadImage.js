import { decode } from 'base64-arraybuffer';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Upload an image URI to Supabase Storage and return its public URL.
 * Cross-platform: web uses fetch(blob), native uses FileSystem base64.
 * @param {string} imageUri - Local or remote image URI.
 * @param {string} bucketName - Supabase storage bucket name.
 * @param {string} filePath - Destination path (include filename + extension).
 * @returns {Promise<string>} public URL of uploaded file.
 */
export async function uploadImage(imageUri, bucketName, filePath) {
  try {
    if (!imageUri) throw new Error('No image URI provided');
    if (!bucketName) throw new Error('No bucket name provided');
    if (!filePath) throw new Error('No file path provided');

    // Derive extension from filePath or URI
    let fileExt = 'jpg';
    const pathParts = filePath.split('.');
    if (pathParts.length > 1) {
      fileExt = pathParts.pop().toLowerCase();
    } else {
      const uriParts = imageUri.split('.');
      if (uriParts.length > 1) fileExt = uriParts.pop().toLowerCase();
    }
    if (fileExt === 'jpeg') fileExt = 'jpg';

    let uploadData;
    if (Platform.OS === 'web') {
      // Web: fetch blob
      const response = await fetch(imageUri);
      uploadData = await response.blob();
    } else {
      // Native: new File API (SDK 54)
      let base64;
      try {
        const fileInstance = new File(imageUri);
        base64 = await fileInstance.base64();
      } catch (fileError) {
        console.error('File API error; consider legacy fallback if needed:', fileError);
        throw new Error('Failed to read image file');
      }
      if (!base64) throw new Error('Failed to read image as base64');
      uploadData = decode(base64);
    }

    // Determine content type (support common images + mp4 video)
    const isVideo = fileExt === 'mp4';
    const contentType = isVideo
      ? 'video/mp4'
      : `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

    // Upload (use upsert true so avatar/media paths overwrite cleanly)
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, uploadData, {
        contentType,
        cacheControl: '3600',
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

export default uploadImage;

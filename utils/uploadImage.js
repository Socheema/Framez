import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Upload an image URI to Supabase Storage and return its public URL.
 * Cross-platform: web uses fetch(blob), native uses FileSystem base64.
 * Includes fallback for Expo Go compatibility.
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

    console.log('[uploadImage] Starting upload:', { imageUri, bucketName, filePath, platform: Platform.OS });

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
      console.log('[uploadImage] Using web blob method');
      const response = await fetch(imageUri);
      uploadData = await response.blob();
    } else {
      // Native: Try new File API first, fallback to legacy method for Expo Go
      let base64;
      try {
        // Try new File API (SDK 54+)
        console.log('[uploadImage] Attempting new File API');
        const { File } = FileSystem;
        if (File) {
          const fileInstance = new File(imageUri);
          base64 = await fileInstance.base64();
          console.log('[uploadImage] New File API succeeded');
        } else {
          throw new Error('File class not available');
        }
      } catch (fileError) {
        // Fallback to legacy FileSystem API for Expo Go compatibility
        console.log('[uploadImage] New File API failed, using legacy fallback:', fileError.message);
        try {
          base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          console.log('[uploadImage] Legacy FileSystem method succeeded');
        } catch (legacyError) {
          console.error('[uploadImage] Legacy fallback also failed:', legacyError);
          throw new Error('Failed to read image file: ' + legacyError.message);
        }
      }

      if (!base64) {
        throw new Error('Failed to read image as base64');
      }

      console.log('[uploadImage] Base64 read successful, length:', base64.length);
      uploadData = decode(base64);
    }

    // Upload (use upsert true so avatar paths overwrite cleanly)
    console.log('[uploadImage] Uploading to Supabase storage...');
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, uploadData, {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('[uploadImage] Supabase storage upload error:', error);
      throw error;
    }

    console.log('[uploadImage] Upload successful, getting public URL...');
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    console.log('[uploadImage] Upload complete, public URL:', publicUrl);

    return publicUrl;
  } catch (error) {
    console.error('[uploadImage] Upload error:', error);
    throw error;
  }
}

export default uploadImage;

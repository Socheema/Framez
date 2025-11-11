import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../utils/supabase';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    // Handle the magic link token from URL
    handlePasswordReset();
  }, []);

  const handlePasswordReset = async () => {
    try {
      // Check for hash parameters (Supabase magic link)
      if (Platform.OS === 'web') {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (accessToken && type === 'recovery') {
          // Set the session using the tokens from the URL
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (error) {
            console.error('Session error:', error);
            setMessage({
              type: 'error',
              text: 'Invalid or expired reset link. Please request a new one.',
            });
            setIsValidSession(false);
            setTimeout(() => router.replace('/forgotPassword'), 3000);
          } else {
            setIsValidSession(true);
          }
        } else {
          // No valid tokens in URL, check existing session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error || !session) {
            setMessage({
              type: 'error',
              text: 'Invalid or expired reset link. Please request a new password reset.',
            });
            setIsValidSession(false);
            setTimeout(() => router.replace('/forgotPassword'), 3000);
          } else {
            setIsValidSession(true);
          }
        }
      } else {
        // For native apps, check the session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          setMessage({
            type: 'error',
            text: 'Invalid or expired reset link. Please request a new password reset.',
          });
          setIsValidSession(false);
          setTimeout(() => router.replace('/forgotPassword'), 3000);
        } else {
          setIsValidSession(true);
        }
      }
    } catch (err) {
      console.error('Password reset handling error:', err);
      setMessage({
        type: 'error',
        text: 'Unable to verify reset link. Please try again.',
      });
      setIsValidSession(false);
    } finally {
      setChecking(false);
    }
  };

  const handleUpdatePassword = async () => {
    setMessage({ type: '', text: '' });

    // Validation
    if (!newPassword) {
      setMessage({ type: 'error', text: 'Please enter a new password.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      // Update the password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Update password error:', error);
        setMessage({ 
          type: 'error', 
          text: 'Unable to update password. Please try again.' 
        });
        setLoading(false);
        return;
      }

      // Sign out after successful password reset
      await supabase.auth.signOut();

      setMessage({
        type: 'success',
        text: 'Password updated successfully! Redirecting to login...',
      });

      setTimeout(() => router.replace('/login'), 2000);

    } catch (err) {
      console.error('Reset password error:', err);
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0095f6" />
          <Text style={styles.loadingText}>Verifying reset link...</Text>
        </View>
      </View>
    );
  }

  if (!isValidSession) {
    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          <Ionicons name="alert-circle-outline" size={64} color="#ff4444" style={styles.errorIcon} />
          <Text style={styles.errorTitle}>Invalid Reset Link</Text>
          <Text style={styles.errorDescription}>
            {message.text || 'This password reset link is invalid or has expired.'}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/forgotPassword')}
          >
            <Text style={styles.buttonText}>Request New Link</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          <Text style={styles.logo}>Create New Password</Text>
          <Text style={styles.subtitle}>
            Enter your new password below
          </Text>

          {message.text ? (
            <View
              style={[
                styles.messageContainer,
                message.type === 'error' ? styles.errorContainer : styles.successContainer,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.type === 'error' ? styles.errorText : styles.successText,
                ]}
              >
                {message.text}
              </Text>
            </View>
          ) : null}

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="New Password"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                setMessage({ type: '', text: '' });
              }}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm New Password"
              placeholderTextColor="#999"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setMessage({ type: '', text: '' });
              }}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleUpdatePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    marginTop: 16,
    fontSize: 16,
  },
  errorIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  logo: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  passwordInput: {
    flex: 1,
    color: '#fff',
    padding: 16,
  },
  eyeIcon: {
    paddingHorizontal: 16,
  },
  button: {
    width: '100%',
    backgroundColor: '#0095f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
  },
  errorContainer: {
    backgroundColor: '#ff444420',
    borderLeftColor: '#ff4444',
  },
  successContainer: {
    backgroundColor: '#00ff0020',
    borderLeftColor: '#00ff00',
  },
  messageText: {
    textAlign: 'center',
  },
  errorText: {
    color: '#ff4444',
  },
  successText: {
    color: '#00ff00',
  },
});

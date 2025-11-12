import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { theme } from '../../constants/theme';
import { hp, wp } from '../../helpers/common';
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
  const [passwordUpdated, setPasswordUpdated] = useState(false); // Track if password was updated
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    // Handle the magic link token from URL - only once
    if (!passwordUpdated) {
      handlePasswordReset();
    }
  }, []); // Empty dependency - run only once

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
    // Prevent duplicate submissions
    if (loading || passwordUpdated) {
      return;
    }

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
        // Handle specific error cases
        if (error.message.includes('New password should be different')) {
          setMessage({
            type: 'error',
            text: 'New password must be different from your current password.',
          });
        } else {
          console.error('Update password error:', error);
          setMessage({
            type: 'error',
            text: error.message || 'Unable to update password. Please try again.'
          });
        }
        setLoading(false);
        return;
      }

      // Mark as updated to prevent retries
      setPasswordUpdated(true);

      setMessage({
        type: 'success',
        text: 'Password updated successfully! Redirecting to login...',
      });

      // Wait for user to see success message
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Sign out after successful password reset
      await supabase.auth.signOut({ scope: 'local' });

      // Small delay to ensure signout completes
      await new Promise(resolve => setTimeout(resolve, 300));

      // Redirect to login
      router.replace('/login');

    } catch (err) {
      console.error('Reset password error:', err);
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.',
      });
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Verifying reset link...</Text>
        </View>
      </View>
    );
  }

  if (!isValidSession) {
    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.rose} style={styles.errorIcon} />
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
              placeholderTextColor={theme.colors.textLight}
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
                color={theme.colors.textLight}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm New Password"
              placeholderTextColor={theme.colors.textLight}
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
                color={theme.colors.textLight}
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
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: wp(5),
    paddingVertical: hp(3),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textLight,
    marginTop: hp(2),
    fontSize: hp(2),
  },
  errorIcon: {
    alignSelf: 'center',
    marginBottom: hp(2),
  },
  errorTitle: {
    fontSize: hp(3),
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: hp(1.5),
  },
  errorDescription: {
    fontSize: hp(1.8),
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: hp(4),
    lineHeight: hp(2.5),
  },
  logo: {
    fontSize: hp(3.5),
    color: theme.colors.text,
    fontWeight: theme.fonts.extrabold,
    textAlign: 'center',
    marginBottom: hp(1),
  },
  subtitle: {
    fontSize: hp(1.8),
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: hp(4),
    lineHeight: hp(2.5),
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: theme.radius.xl,
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: theme.colors.gray,
  },
  passwordInput: {
    flex: 1,
    color: theme.colors.text,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
    fontSize: hp(2),
  },
  eyeIcon: {
    paddingHorizontal: wp(4),
  },
  button: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    paddingVertical: hp(1.8),
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    marginTop: hp(1.5),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: theme.fonts.bold,
    fontSize: hp(2),
  },
  messageContainer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderRadius: theme.radius.md,
    marginBottom: hp(1.5),
    borderLeftWidth: 3,
  },
  errorContainer: {
    backgroundColor: `${theme.colors.rose}20`,
    borderLeftColor: theme.colors.rose,
  },
  successContainer: {
    backgroundColor: `${theme.colors.primary}20`,
    borderLeftColor: theme.colors.primary,
  },
  messageText: {
    textAlign: 'center',
    fontSize: hp(1.6),
  },
  errorText: {
    color: theme.colors.rose,
  },
  successText: {
    color: theme.colors.primary,
  },
});

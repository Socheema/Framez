import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useAuthStore } from '../../stores/auth';
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
  const { setPasswordRecovery } = useAuthStore();

  // Use refs to prevent race conditions and duplicate processing
  const passwordUpdatedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const sessionVerifiedRef = useRef(false);

  useEffect(() => {
    // Handle the magic link token from URL - only once on mount
    // Using ref to prevent double-execution in strict mode
    if (!sessionVerifiedRef.current) {
      sessionVerifiedRef.current = true;
      handlePasswordReset();
    }
  }, []); // Empty dependency - run only once

  const handlePasswordReset = useCallback(async () => {
    console.log('[ResetPassword] Starting session verification...');
    try {
      // Check for hash parameters (Supabase magic link)
      if (Platform.OS === 'web') {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        console.log('[ResetPassword] Web platform - checking hash params. Type:', type);

        if (accessToken && type === 'recovery') {
          // Set the session using the tokens from the URL
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (error) {
            console.error('[ResetPassword] Session setup error:', error);
            setMessage({
              type: 'error',
              text: 'Invalid or expired reset link. Please request a new one.',
            });
            setIsValidSession(false);
            // Clear URL query params to prevent re-processing
            setTimeout(() => {
              router.replace('/resetPassword');
            }, 500);
          } else {
            console.log('[ResetPassword] Session established successfully');
            setIsValidSession(true);
            // Mark as password recovery to prevent global redirects
            setPasswordRecovery(true);
          }
        } else {
          // No valid tokens in URL, check existing session
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error || !session) {
            console.log('[ResetPassword] No valid session found');
            setMessage({
              type: 'error',
              text: 'Invalid or expired reset link. Please request a new password reset.',
            });
            setIsValidSession(false);
            setTimeout(() => {
              router.replace('/forgotPassword');
            }, 1500);
          } else {
            console.log('[ResetPassword] Session found');
            setIsValidSession(true);
            setPasswordRecovery(true);
          }
        }
      } else {
        // For native apps, check the session
        console.log('[ResetPassword] Native platform - checking session');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          console.log('[ResetPassword] No valid session for native app');
          setMessage({
            type: 'error',
            text: 'Invalid or expired reset link. Please request a new password reset.',
          });
          setIsValidSession(false);
          setTimeout(() => {
            router.replace('/forgotPassword');
          }, 1500);
        } else {
          console.log('[ResetPassword] Session valid for native app');
          setIsValidSession(true);
          setPasswordRecovery(true);
        }
      }
    } catch (err) {
      console.error('[ResetPassword] Error during session verification:', err);
      setMessage({
        type: 'error',
        text: 'Unable to verify reset link. Please try again.',
      });
      setIsValidSession(false);
    } finally {
      setChecking(false);
    }
  }, [router, setPasswordRecovery]);

  const handleCancel = useCallback(() => {
    console.log('[ResetPassword] Cancel button pressed');

    // Clear all state
    setNewPassword('');
    setConfirmPassword('');
    setMessage({ type: '', text: '' });
    setPasswordRecovery(false);

    // Simple direct navigation - no history checking
    // This prevents bouncing and redirect loops
    router.replace('/login');
  }, [router, setPasswordRecovery]);

  const handleUpdatePassword = useCallback(async () => {
    // Prevent concurrent/duplicate submissions using ref
    if (isProcessingRef.current || passwordUpdatedRef.current) {
      console.log('[ResetPassword] Already processing or completed - ignoring duplicate call');
      return;
    }

    // Prevent duplicate submissions based on UI state
    if (loading) {
      console.log('[ResetPassword] Already loading - ignoring');
      return;
    }

    console.log('[ResetPassword] Starting password update flow');

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

    // Mark as processing to prevent race conditions
    isProcessingRef.current = true;
    setLoading(true);

    try {
      console.log('[ResetPassword] Calling supabase.auth.updateUser()');

      // Single API call to update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('[ResetPassword] updateUser error:', error);

        // Handle specific error cases
        if (error.message.includes('New password should be different')) {
          setMessage({
            type: 'error',
            text: 'New password must be different from your current password.',
          });
        } else {
          setMessage({
            type: 'error',
            text: error.message || 'Unable to update password. Please try again.'
          });
        }

        // Reset processing flag on error to allow retry
        isProcessingRef.current = false;
        setLoading(false);
        return;
      }

      console.log('[ResetPassword] Password updated successfully');

      // Mark as permanently completed to prevent any retries
      passwordUpdatedRef.current = true;

      // Show success message
      setMessage({
        type: 'success',
        text: 'Password updated successfully! Redirecting to login...',
      });

      // Wait for user to see success message
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('[ResetPassword] Signing out user');

      // Clear recovery flag immediately to prevent global listener conflicts
      setPasswordRecovery(false);

      // Wait a bit for recovery flag to propagate
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        // Sign out to clear the recovery session
        const { error: signoutError } = await supabase.auth.signOut({ scope: 'local' });
        if (signoutError) {
          console.warn('[ResetPassword] Signout warning (continuing anyway):', signoutError);
        } else {
          console.log('[ResetPassword] Signout successful');
        }
      } catch (signoutErr) {
        console.warn('[ResetPassword] Signout exception (continuing anyway):', signoutErr);
      }

      // Small delay to ensure signout completes
      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('[ResetPassword] Redirecting to login');

      // Clear the form
      setNewPassword('');
      setConfirmPassword('');
      setMessage({ type: '', text: '' });

      // Direct navigation - use /login (not /(auth)/login which might not exist in route structure)
      // Replacing prevents back navigation to reset page
      router.replace('/login');

    } catch (err) {
      console.error('[ResetPassword] Unexpected error during password update:', err);
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.',
      });
      // Reset processing flag on error
      isProcessingRef.current = false;
      setLoading(false);
    }
  }, [loading, router, setPasswordRecovery]);

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
            onPress={() => {
              setPasswordRecovery(false);
              router.replace('/forgotPassword');
            }}
          >
            <Text style={styles.buttonText}>Request New Link</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setPasswordRecovery(false);
              router.replace('/login');
            }}
          >
            <Text style={styles.cancelButtonText}>Back to Login</Text>
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

          <TouchableOpacity
            style={[styles.cancelButton, loading && styles.buttonDisabled]}
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
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
  cancelButton: {
    width: '100%',
    backgroundColor: '#f0f0f0',
    paddingVertical: hp(1.8),
    borderRadius: theme.radius.xl,
    alignItems: 'center',
    marginTop: hp(1),
    borderWidth: 1,
    borderColor: theme.colors.gray,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: theme.fonts.bold,
    fontSize: hp(2),
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontWeight: theme.fonts.semibold,
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

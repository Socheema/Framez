import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import Button from '../../components/Button';
import ScreenWrapper from '../../components/ScreenWrapper';
import { theme } from '../../constants/theme';
import { hp, wp } from '../../helpers/common';
import { useThemeStore } from '../../stores/themeStore';
import { supabase } from '../../utils/supabase';

export default function UpdatePassword() {
  const { theme: currentTheme } = useThemeStore();
  const colors = currentTheme.colors;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false); // Track if we're in the update process
  const [hasChecked, setHasChecked] = useState(false); // Track if we've already checked
  const [passwordUpdated, setPasswordUpdated] = useState(false); // Track if password was successfully updated
  const router = useRouter();

  // Styles depend on theme/colors; memoize and define before any early returns
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      backgroundColor: colors.background,
    },
    inner: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: wp(5),
      paddingVertical: hp(3),
      paddingTop: Platform.OS === 'ios' ? hp(8) : hp(6),
    },
    backButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? hp(8) : hp(3),
      left: wp(5),
      zIndex: 10,
    },
    icon: {
      alignSelf: 'center',
      marginBottom: hp(3),
    },
    logo: {
      fontSize: hp(3.5),
      color: colors.text,
      fontWeight: theme.fonts.extrabold,
      textAlign: 'center',
      marginBottom: hp(1),
    },
    subtitle: {
      fontSize: hp(1.7),
      color: colors.textLight,
      textAlign: 'center',
      marginBottom: hp(3),
      lineHeight: hp(2.5),
    },
    passwordContainer: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: theme.radius.xl,
      marginBottom: hp(1.5),
      borderWidth: 1,
      borderColor: colors.border,
    },
    passwordInput: {
      flex: 1,
      color: colors.text,
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.8),
      fontSize: hp(2),
    },
    eyeIcon: {
      paddingHorizontal: wp(4),
    },
    cancelContainer: {
      alignItems: 'center',
      marginTop: hp(2),
    },
    cancelText: {
      color: colors.textLight,
      fontSize: hp(1.6),
      fontWeight: theme.fonts.semibold,
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
  }), [colors, currentTheme]);

  // Check if this is a password recovery session - ONLY ONCE
  useEffect(() => {
    if (!hasChecked && !isUpdating && !passwordUpdated) {
      checkRecoverySession();
    }
  }, []); // Empty dependency array - run only once on mount

  const checkRecoverySession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setMessage({
          type: 'error',
          text: 'Invalid or expired reset link. Please request a new password reset.',
        });
        setHasChecked(true);
        setTimeout(() => router.replace('/forgotPassword'), 3000);
        return;
      }

      // Valid session exists for password recovery
      setIsRecoverySession(true);
      setHasChecked(true);
    } catch (error) {
      console.error('Error checking session:', error);
      setMessage({
        type: 'error',
        text: 'Unable to verify reset link. Please try again.',
      });
      setHasChecked(true);
      setTimeout(() => router.replace('/forgotPassword'), 3000);
    }
  };

  const handleUpdatePassword = async () => {
    // Prevent duplicate submissions
    if (loading || isUpdating || passwordUpdated) {
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
    setIsUpdating(true); // Prevent session checks

    try {
      // Update the user's password - this will only succeed once
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        // Handle the case where password is same as old password
        if (updateError.message.includes('New password should be different')) {
          setMessage({
            type: 'error',
            text: 'New password must be different from your current password.',
          });
        } else {
          console.error('Update password error:', updateError);
          setMessage({
            type: 'error',
            text: updateError.message || 'Unable to update password. Please try again.',
          });
        }
        setLoading(false);
        setIsUpdating(false);
        return;
      }

      // Mark password as updated to prevent any retries
      setPasswordUpdated(true);

      setMessage({
        type: 'success',
        text: 'Password updated successfully! Redirecting to login...',
      });

      // Wait for user to see success message
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Sign out to clear the recovery session
      await supabase.auth.signOut({ scope: 'local' });

      // Small delay to ensure signout completes
      await new Promise(resolve => setTimeout(resolve, 300));

      // Redirect to login with success message
      router.replace('/login?message=password-updated');

    } catch (err) {
      console.error('Password update error:', err);
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.',
      });
      setLoading(false);
      setIsUpdating(false);
    }
  };

  const handleCancel = async () => {
    setIsUpdating(true); // Prevent session check
    setPasswordUpdated(true); // Prevent any retries
    // Sign out and go back to login
    await supabase.auth.signOut({ scope: 'local' });
    router.replace('/login');
  };

  const handleBack = async () => {
    setIsUpdating(true); // Prevent session check
    setPasswordUpdated(true); // Prevent any retries
    // Sign out and go back to login
    await supabase.auth.signOut({ scope: 'local' });
    router.replace('/login');
  };

  if (!isRecoverySession && !message.text) {
    return (
      <ScreenWrapper bg={colors.background}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }



  return (
    <ScreenWrapper bg={colors.background}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inner}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>

            <Ionicons name="lock-closed" size={hp(8)} color={theme.colors.primary} style={styles.icon} />

            <Text style={styles.logo}>Set New Password</Text>
            <Text style={styles.subtitle}>
              Please enter your new password below
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
                placeholderTextColor={colors.textLight}
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
                  color={colors.textLight}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm New Password"
                placeholderTextColor={colors.textLight}
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
                  color={colors.textLight}
                />
              </TouchableOpacity>
            </View>

            <Button
              title="Update Password"
              onPress={handleUpdatePassword}
              loading={loading}
            />

            <TouchableOpacity
              style={styles.cancelContainer}
              onPress={handleCancel}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

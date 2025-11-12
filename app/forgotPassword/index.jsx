import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
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
import { supabase } from '../../utils/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const handleSendResetLink = async () => {
    setMessage({ type: '', text: '' });

    // Validation
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter your email address.' });
      return;
    }
    if (!validateEmail(email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setLoading(true);
    try {
      // Send password reset email with magic link
      const redirectUrl = Platform.OS === 'web'
        ? `${window.location.origin}/updatePassword`
        : 'framez://updatePassword';

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase(),
        {
          redirectTo: redirectUrl,
        }
      );

      if (error) {
        console.error('Reset email error:', error);
        setMessage({
          type: 'error',
          text: 'Unable to send reset email. Please try again.'
        });
        setLoading(false);
        return;
      }

      setEmailSent(true);
      setMessage({
        type: 'success',
        text: 'Password reset link sent! Please check your email and click the link to reset your password.',
      });

    } catch (err) {
      console.error('Send reset link error:', err);
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper bg="#fff">
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
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            <Text style={styles.logo}>Reset Password</Text>
            <Text style={styles.subtitle}>
              {emailSent
                ? 'Check your email for the password reset link'
                : 'Enter your email address to receive a password reset link'
              }
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

            {!emailSent && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={theme.colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setMessage({ type: '', text: '' });
                  }}
                />

                <Button 
                  title="Send Reset Link" 
                  onPress={handleSendResetLink} 
                  loading={loading} 
                />
              </>
            )}

            {emailSent && (
              <View style={styles.instructionsContainer}>
                <Ionicons name="mail-outline" size={hp(6)} color={theme.colors.primary} style={styles.mailIcon} />
                <Text style={styles.instructionsTitle}>Email Sent!</Text>
                <Text style={styles.instructionsText}>
                  We've sent a password reset link to{'\n'}
                  <Text style={styles.emailHighlight}>{email}</Text>
                </Text>
                <Text style={styles.instructionsText}>
                  Click the link in the email to reset your password. The link will expire in 1 hour.
                </Text>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={() => {
                    setEmailSent(false);
                    setMessage({ type: '', text: '' });
                  }}
                >
                  <Text style={styles.resendText}>Didn't receive the email? Try again</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.linkContainer}>
              <Text style={styles.linkText}>Remember your password? </Text>
              <TouchableOpacity onPress={() => router.replace('/login')}>
                <Text style={styles.link}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  logo: {
    fontSize: hp(3.5),
    color: theme.colors.text,
    fontWeight: theme.fonts.extrabold,
    textAlign: 'center',
    marginBottom: hp(1),
  },
  subtitle: {
    fontSize: hp(1.7),
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: hp(3),
    lineHeight: hp(2.5),
    paddingHorizontal: wp(3),
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    color: theme.colors.text,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
    borderRadius: theme.radius.xl,
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: theme.colors.gray,
    fontSize: hp(2),
  },
  instructionsContainer: {
    alignItems: 'center',
    paddingVertical: hp(2),
  },
  mailIcon: {
    marginBottom: hp(2),
  },
  instructionsTitle: {
    fontSize: hp(2.8),
    fontWeight: theme.fonts.bold,
    color: theme.colors.text,
    marginBottom: hp(2),
  },
  instructionsText: {
    fontSize: hp(1.7),
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: hp(1.5),
    lineHeight: hp(2.5),
  },
  emailHighlight: {
    color: theme.colors.primary,
    fontWeight: theme.fonts.semibold,
  },
  resendButton: {
    marginTop: hp(3),
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
  },
  resendText: {
    color: theme.colors.primaryDark,
    fontSize: hp(1.7),
    textAlign: 'center',
    fontWeight: theme.fonts.semibold,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: hp(3),
  },
  linkText: {
    color: theme.colors.text,
    fontSize: hp(1.6),
  },
  link: {
    color: theme.colors.primaryDark,
    fontWeight: theme.fonts.semibold,
    fontSize: hp(1.6),
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

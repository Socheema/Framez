import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
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
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setMessage({ type: '', text: '' });
                }}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendResetLink}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {emailSent && (
            <View style={styles.instructionsContainer}>
              <Ionicons name="mail-outline" size={48} color="#0095f6" style={styles.mailIcon} />
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 24,
    zIndex: 10,
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
    paddingHorizontal: 20,
  },
  input: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
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
  instructionsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  mailIcon: {
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  instructionsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  emailHighlight: {
    color: '#0095f6',
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 24,
    padding: 12,
  },
  resendText: {
    color: '#0095f6',
    fontSize: 14,
    textAlign: 'center',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  linkText: {
    color: '#999',
  },
  link: {
    color: '#0095f6',
    fontWeight: '600',
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

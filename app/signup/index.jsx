import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Button from '../../components/Button';
import ScreenWrapper from '../../components/ScreenWrapper';
import { theme } from '../../constants/theme';
import { hp, wp } from '../../helpers/common';
import { useAuthStore } from '../../stores/auth';

export default function Signup() {
  const { signUp, session } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 🔒 Redirect if already authenticated
  useEffect(() => {
    if (session) {
      console.log('✅ Already authenticated - redirecting to tabs');
      router.replace('/tabs');
    }
  }, [session]);

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const handleSignup = async () => {
    setMessage({ type: '', text: '' });

    // Validation
    if (!name.trim()) return setMessage({ type: 'error', text: 'Please enter your name.' });
    if (name.trim().length < 2)
      return setMessage({ type: 'error', text: 'Name must be at least 2 characters.' });
    if (!email.trim()) return setMessage({ type: 'error', text: 'Please enter your email.' });
    if (!validateEmail(email))
      return setMessage({ type: 'error', text: 'Please enter a valid email address.' });
    if (!password) return setMessage({ type: 'error', text: 'Please enter a password.' });
    if (password.length < 6)
      return setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
    if (password !== confirmPassword)
      return setMessage({ type: 'error', text: 'Passwords do not match.' });

    setLoading(true);
    try {
      const result = await signUp({ name, email, password });

      if (result.success) {
        if (result.requiresVerification) {
          setMessage({
            type: 'success',
            text:
              'Signup successful! Please check your email to confirm your account before signing in.',
          });
          setTimeout(() => router.replace('/login'), 4000);
        } else {
          setMessage({
            type: 'success',
            text: 'Your account has been created successfully. Redirecting...',
          });
          setTimeout(() => router.replace('/(tabs)'), 2000);
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Signup failed. Please try again.' });
      }
    } catch (err) {
      console.error('Signup error:', err);
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again later.',
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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inner}>
            <Text style={styles.logo}>Framez</Text>
            <Text style={styles.subtitle}>Create your account</Text>

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

            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={theme.colors.textLight}
              value={name}
              onChangeText={(text) => {
                setName(text);
                setMessage({ type: '', text: '' });
              }}
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={theme.colors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setMessage({ type: '', text: '' });
              }}
            />

            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              placeholderTextColor={theme.colors.textLight}
              secureTextEntry
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setMessage({ type: '', text: '' });
              }}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={theme.colors.textLight}
              secureTextEntry
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setMessage({ type: '', text: '' });
              }}
            />

            <Button title="Sign Up" onPress={handleSignup} loading={loading} />

            <View style={styles.linkContainer}>
              <Text style={styles.linkText}>Already have an account? </Text>
              <Link href="/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.link}>Sign In</Text>
                </TouchableOpacity>
              </Link>
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
    gap: hp(1.5),
  },
  logo: {
    fontSize: hp(4),
    color: theme.colors.text,
    fontWeight: theme.fonts.extrabold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: hp(1.8),
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: hp(2),
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    color: theme.colors.text,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.gray,
    fontSize: hp(2),
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

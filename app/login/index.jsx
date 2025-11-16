import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
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
import { useAuthStore } from '../../stores/auth';
import { useThemeStore } from '../../stores/themeStore';

export default function Login() {
  const { theme: currentTheme } = useThemeStore();
  const colors = currentTheme.colors;
  const { signIn, session } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();

  // 🔒 Redirect if already authenticated
  useEffect(() => {
    if (session) {
      console.log('✅ Already authenticated - redirecting to tabs');
      router.replace('/tabs');
    }
  }, [session]);

  // Check for success message (e.g., password-updated)
  useEffect(() => {
    if (params.message === 'password-updated') {
      setSuccessMessage('Password updated successfully! You can now sign in with your new password.');
      // Clear the message from URL after showing it
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [params.message]);

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const handleLogin = async () => {
    setValidationError('');

    // Validation
    if (!email.trim()) {
      setValidationError('Please enter your email.');
      return;
    }
    if (!validateEmail(email)) {
      setValidationError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setValidationError('Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn({ email, password });

      if (result.success) {
        // ✅ Navigate to main app (tabs)
        router.replace('/tabs');
      } else {
        setValidationError(result.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setValidationError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    inner: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: wp(5),
      paddingVertical: hp(3),
    },
    logo: {
      fontSize: hp(5),
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
    },
    input: {
      width: '100%',
      backgroundColor: colors.inputBackground,
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.8),
      borderRadius: theme.radius.xl,
      marginBottom: hp(1.5),
      fontSize: hp(2),
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginBottom: hp(2),
    },
    forgotPasswordText: {
      color: colors.primary,
      fontSize: hp(1.6),
      fontWeight: theme.fonts.semibold,
    },
    linkContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: hp(3),
    },
    linkText: {
      color: colors.textLight,
      fontSize: hp(1.6),
    },
    link: {
      color: colors.primary,
      fontSize: hp(1.6),
      fontWeight: theme.fonts.semibold,
    },
    errorContainer: {
      backgroundColor: `${theme.colors.rose}20`,
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.5),
      borderRadius: theme.radius.md,
      marginBottom: hp(1.5),
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.rose,
    },
    errorText: {
      color: theme.colors.rose,
      textAlign: 'center',
      fontSize: hp(1.6),
    },
    successContainer: {
      backgroundColor: `${theme.colors.primary}20`,
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.5),
      borderRadius: theme.radius.md,
      marginBottom: hp(1.5),
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
    },
    successText: {
      color: theme.colors.primary,
      textAlign: 'center',
      fontSize: hp(1.6),
    },
  });

  return (
    <ScreenWrapper bg={colors.background}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.inner}>
          <Text style={styles.logo}>Framez</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          {successMessage ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {validationError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{validationError}</Text>
            </View>
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setValidationError('');
            }}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textLight}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setValidationError('');
            }}
          />

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            buttonStyle={{ marginTop: hp(2) }}
          />

          <Link href="/forgotPassword" asChild>
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </Link>

          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>Don't have an account? </Text>
            <Link href="/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

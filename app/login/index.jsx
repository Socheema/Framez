import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
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

export default function Login() {
  const { signIn } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

  return (
    <ScreenWrapper bg="#fff">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.inner}>
          <Text style={styles.logo}>Framez</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          {validationError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{validationError}</Text>
            </View>
          ) : null}

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
              setValidationError('');
            }}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={theme.colors.textLight}
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
            <TouchableOpacity style={styles.forgotPasswordContainer}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: wp(5),
    gap: hp(2),
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
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: hp(1),
  },
  forgotPasswordText: {
    color: theme.colors.primaryDark,
    fontSize: hp(1.8),
    fontWeight: theme.fonts.semibold,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: hp(2),
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
  errorContainer: {
    backgroundColor: `${theme.colors.rose}20`,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderRadius: theme.radius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.rose,
  },
  errorText: {
    color: theme.colors.rose,
    textAlign: 'center',
    fontSize: hp(1.6),
  },
});

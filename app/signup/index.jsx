import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthStore } from '../../stores/auth';

export default function Signup() {
  const { signUp } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
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
          placeholderTextColor="#999"
          value={name}
          onChangeText={(text) => {
            setName(text);
            setMessage({ type: '', text: '' });
          }}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
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
          placeholderTextColor="#999"
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
          placeholderTextColor="#999"
          secureTextEntry
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setMessage({ type: '', text: '' });
          }}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>Already have an account? </Text>
          <Link href="/login" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
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
  },
  errorContainer: {
    backgroundColor: '#ff444420',
    borderLeftWidth: 3,
    borderLeftColor: '#ff4444',
  },
  successContainer: {
    backgroundColor: '#44ff4440',
    borderLeftWidth: 3,
    borderLeftColor: '#00C851',
  },
  messageText: {
    textAlign: 'center',
    fontSize: 14,
  },
  errorText: {
    color: '#ff4444',
  },
  successText: {
    color: '#00C851',
  },
});

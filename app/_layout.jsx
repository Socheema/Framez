import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { theme } from '../constants/theme';
import { useAuthStore } from '../stores/auth';

export default function RootLayout() {
  const { session, isLoaded, loadAuth, isPasswordRecovery } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  // Load authentication on app start
  useEffect(() => {
    loadAuth();
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!isLoaded) return; // Wait for auth to load

    const inAuthGroup = segments[0] === 'tabs';
    const inUpdatePassword = segments[0] === 'updatePassword';
    const inLogin = segments[0] === 'login';
    const inForgotPassword = segments[0] === 'forgotPassword';
    const inResetPassword = segments[0] === 'resetPassword';
    const inSignup = segments[0] === 'signup';
    const inUserProfile = segments[0] === 'userProfile'; // User profile page
    const inPostDetail = segments[0] === 'postDetail'; // Post detail page
    const inWelcome = segments[0] === undefined || segments[0] === 'welcome' || segments[0] === 'index';

    // If user is on updatePassword page, let that page handle its own navigation
    // Don't interfere with password update flow
    if (inUpdatePassword) {
      return;
    }

    // If this is a password recovery session, redirect to updatePassword page
    if (session && isPasswordRecovery && !inUpdatePassword) {
      router.replace('/updatePassword');
      return;
    }

    // 🔒 Redirect authenticated users to tabs (from public pages only)
    if (session && !inAuthGroup && !inUserProfile && !inPostDetail && !isPasswordRecovery && !inLogin && !inForgotPassword && !inResetPassword && !inSignup) {
      console.log('✅ User authenticated - redirecting to tabs');
      router.replace('/tabs');
    }
    // 🔒 Redirect unauthenticated users to login (from protected pages)
    else if (!session && (inAuthGroup || inUserProfile || inPostDetail)) {
      console.log('⚠️ User not authenticated - redirecting to login');
      router.replace('/login');
    }
  }, [session, isLoaded, segments, isPasswordRecovery]);

  // Show loading while checking auth
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return <Slot />;
}

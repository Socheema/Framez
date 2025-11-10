import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../stores/auth';

export default function RootLayout() {
  const { session, isLoaded, loadAuth } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  // Load authentication on app start
  useEffect(() => {
    loadAuth();
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!isLoaded) return; // Wait for auth to load

    const inAuthGroup = segments[0] === '(tabs)';

    if (session && !inAuthGroup) {
      // ✅ User is signed in but not in protected route, redirect to tabs
      router.replace('/tabs');
    } else if (!session && inAuthGroup) {
      // ✅ User is not signed in but trying to access protected route, redirect to index
      router.replace('/');
    }
  }, [session, isLoaded, segments]);

  // Show loading while checking auth
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#0095f6" />
      </View>
    );
  }

  return <Slot />;
}

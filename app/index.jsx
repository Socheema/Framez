import { Redirect, useRouter } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { View } from 'react-native'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../utils/supabase'

console.log('=== APP INDEX.JSX LOADED ===');

export default function Index() {
  const { session, isLoaded, loadAuth } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    console.log('=== INDEX USEEFFECT: Preventing splash auto-hide ===');
    SplashScreen.preventAutoHideAsync()
    console.log('=== INDEX USEEFFECT: Loading auth ===');
    loadAuth()

    // Set up auth state listener - but handle password recovery specially
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('=== AUTH STATE CHANGE ===', event);
      // Don't redirect during password recovery events
      // Let the updatePassword/resetPassword pages handle navigation
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked password reset link - let them go to updatePassword
        return;
      }

      // For SIGNED_OUT event after password update, go to login
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
        return;
      }

      // For other events, handle normal navigation
      if (event === 'SIGNED_IN' && newSession) {
        router.replace('/tabs');
      } else if (event === 'USER_UPDATED' && newSession) {
        // User updated their profile/password - don't redirect unless signed out
        return;
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    console.log('=== INDEX USEEFFECT: isLoaded changed ===', isLoaded);
    if (isLoaded) {
      console.log('=== INDEX USEEFFECT: Hiding splash screen ===');
      SplashScreen.hideAsync()
    }
  }, [isLoaded])

  if (!isLoaded) {
    console.log('=== INDEX RENDER: Auth not loaded yet, showing empty view ===');
    return <View />
  }

  console.log('=== INDEX RENDER: Auth loaded, redirecting. Session:', !!session);
  return <Redirect href={session ? '/tabs' : '/welcome'} />
}

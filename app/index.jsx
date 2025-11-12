import { useEffect } from 'react'
import { View } from 'react-native'
import { Redirect, useRouter } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../utils/supabase'

export default function Index() {
  const { session, isLoaded, loadAuth } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    SplashScreen.preventAutoHideAsync()
    loadAuth()

    // Set up auth state listener - but handle password recovery specially
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
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
    if (isLoaded) SplashScreen.hideAsync()
  }, [isLoaded])

  if (!isLoaded) return <View />

  return <Redirect href={session ? '/tabs' : '/welcome'} />
}

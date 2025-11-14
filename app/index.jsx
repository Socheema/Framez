import { Redirect, useRouter } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../utils/supabase'

console.log('=== APP INDEX.JSX LOADED ===');

export default function Index() {
  const { session, isLoaded, loadAuth, isPasswordRecovery } = useAuthStore()
  const router = useRouter()
  const listenerSetupRef = useRef(false)

  useEffect(() => {
    console.log('=== INDEX USEEFFECT: Preventing splash auto-hide ===');
    SplashScreen.preventAutoHideAsync()
    console.log('=== INDEX USEEFFECT: Loading auth ===');
    loadAuth()

    // Set up auth state listener - but only once
    if (!listenerSetupRef.current) {
      listenerSetupRef.current = true
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
        console.log('[INDEX] Auth state change event:', event);
        
        // CRITICAL: Do not redirect during password recovery flow
        // The reset password page handles its own navigation
        if (isPasswordRecovery) {
          console.log('[INDEX] Password recovery active - ignoring auth event');
          return;
        }
        
        // CRITICAL: Ignore PASSWORD_RECOVERY event - let reset page handle it
        if (event === 'PASSWORD_RECOVERY') {
          console.log('[INDEX] PASSWORD_RECOVERY event received - ignoring (reset page handles)');
          return;
        }

        // CRITICAL: For SIGNED_OUT, only redirect if not on password reset flow
        if (event === 'SIGNED_OUT') {
          console.log('[INDEX] SIGNED_OUT event - checking if should redirect');
          // Double-check recovery flag in case timing issues
          const { isPasswordRecovery: currentRecoveryFlag } = useAuthStore.getState();
          if (!currentRecoveryFlag) {
            console.log('[INDEX] Not in recovery - redirecting to login');
            router.replace('/login');
          } else {
            console.log('[INDEX] Still in recovery - not redirecting on SIGNED_OUT');
          }
          return;
        }

        // For SIGNED_IN event, redirect to tabs only if not in recovery
        if (event === 'SIGNED_IN' && newSession) {
          console.log('[INDEX] SIGNED_IN event - checking if should redirect to tabs');
          const { isPasswordRecovery: currentRecoveryFlag } = useAuthStore.getState();
          if (!currentRecoveryFlag) {
            console.log('[INDEX] Not in recovery - redirecting to tabs');
            router.replace('/tabs');
          } else {
            console.log('[INDEX] Still in recovery - not redirecting on SIGNED_IN');
          }
          return;
        }

        // For USER_UPDATED event, don't redirect
        if (event === 'USER_UPDATED') {
          console.log('[INDEX] USER_UPDATED event - not redirecting');
          return;
        }

        console.log('[INDEX] Auth event:', event, '- no action taken');
      })

      return () => {
        console.log('[INDEX] Unsubscribing from auth state changes');
        subscription.unsubscribe()
      }
    }
  }, [isPasswordRecovery])

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


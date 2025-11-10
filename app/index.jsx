import { Redirect, useRouter } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { View } from 'react-native'
import { useAuthStore } from '../stores/auth'
import { supabase } from '../utils/supabase'

export default function Index() {
  const { session, isLoaded, loadAuth, setSession } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    SplashScreen.preventAutoHideAsync()
    loadAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession) {
        router.replace('/tabs')
      } else {
        router.replace('/welcome')
      }
    })

    return () => subscription.unsubscribe()
  }, [setSession])

  useEffect(() => {
    if (isLoaded) SplashScreen.hideAsync()
  }, [isLoaded])

  if (!isLoaded) return <View />

  return <Redirect href={session ? '/tabs' : '/welcome'} />
}

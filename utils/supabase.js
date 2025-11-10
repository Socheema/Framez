import { AppState, Platform } from "react-native"
import "react-native-url-polyfill/auto"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { createClient } from "@supabase/supabase-js"

// 🧩 Your project credentials
const supabaseUrl = "https://qligxzesycdcchyznncw.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsaWd4emVzeWNkY2NoeXpubmN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjE5MTksImV4cCI6MjA3ODMzNzkxOX0.z0Uux9yaRgRX5racdcagN_Se818nfc9ZLBkIbPUk6Vw"

// 🛡️ Safe client creation
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // ✅ Only attach AsyncStorage on native platforms
    storage: Platform.OS === "ios" || Platform.OS === "android" ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// 🕒 Handle app state for session refresh
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh()
    } else {
      supabase.auth.stopAutoRefresh()
    }
  })
}

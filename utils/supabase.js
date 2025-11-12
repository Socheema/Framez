import AsyncStorage from "@react-native-async-storage/async-storage"
import { createClient } from "@supabase/supabase-js"
import { AppState, Platform } from "react-native"
import "react-native-url-polyfill/auto"

// 🧩 Supabase Configuration from Environment Variables
// Get your credentials from: Supabase Dashboard → Settings → API
// Add them to .env file (see .env.example for template)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

// ✅ Validate environment variables are loaded
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Missing Supabase environment variables!\n\n' +
    'Please ensure you have:\n' +
    '1. Created a .env file in the project root\n' +
    '2. Added EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY\n' +
    '3. Restarted your dev server: npx expo start --clear\n\n' +
    'See .env.example for instructions.'
  )
}

// 🛡️ Safe client creation with Realtime support
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // ✅ Only attach AsyncStorage on native platforms
    storage: Platform.OS === "ios" || Platform.OS === "android" ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web", // Enable URL detection only on web for magic links
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
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

// ==================== REALTIME SUBSCRIPTIONS ====================

/**
 * Subscribe to realtime changes on a specific table
 * @param {string} table - Table name (posts, likes, comments, profiles)
 * @param {function} onInsert - Callback for INSERT events
 * @param {function} onUpdate - Callback for UPDATE events
 * @param {function} onDelete - Callback for DELETE events
 * @returns {object} Subscription object with unsubscribe method
 */
export function subscribeToTable(table, { onInsert, onUpdate, onDelete }) {
  const channel = supabase
    .channel(`${table}_changes`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: table
      },
      (payload) => {
        if (onInsert) onInsert(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: table
      },
      (payload) => {
        if (onUpdate) onUpdate(payload.new, payload.old);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: table
      },
      (payload) => {
        if (onDelete) onDelete(payload.old);
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    }
  };
}

/**
 * Subscribe to multiple tables at once
 * @param {Array} tables - Array of table configurations
 * @returns {function} Cleanup function to unsubscribe from all
 */
export function subscribeToMultipleTables(tables) {
  const subscriptions = tables.map(({ table, onInsert, onUpdate, onDelete }) =>
    subscribeToTable(table, { onInsert, onUpdate, onDelete })
  );

  return () => {
    subscriptions.forEach(sub => sub.unsubscribe());
  };
}

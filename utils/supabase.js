import AsyncStorage from "@react-native-async-storage/async-storage"
import { createClient } from "@supabase/supabase-js"
import Constants from "expo-constants"
import { AppState, Platform } from "react-native"
import "react-native-url-polyfill/auto"


const getEnvVar = (key, configKey) => {
  // Try Constants.expoConfig.extra first (production builds)
  if (Constants.expoConfig?.extra?.[configKey]) {
    console.log(`✅ Found ${configKey} in Constants.expoConfig.extra`);
    return Constants.expoConfig.extra[configKey];
  }
  // Fall back to process.env (development)
  const envValue = process.env[key];
  if (envValue) {
    console.log(`✅ Found ${key} in process.env`);
    return envValue;
  }
  console.error(`❌ Missing ${key} / ${configKey}`);
  return null;
};

console.log('=== SUPABASE INITIALIZATION STARTING ===');
console.log('Platform:', Platform.OS);
console.log('Constants.expoConfig.extra:', Constants.expoConfig?.extra);

const supabaseUrl = getEnvVar('EXPO_PUBLIC_SUPABASE_URL', 'supabaseUrl');
const supabaseAnonKey = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'supabaseAnonKey');

// ✅ Validate environment variables are loaded
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage =
    '❌ CRITICAL: Missing Supabase environment variables!\n\n' +
    'Supabase URL: ' + (supabaseUrl ? '✅ Found' : '❌ Missing') + '\n' +
    'Supabase Key: ' + (supabaseAnonKey ? '✅ Found' : '❌ Missing') + '\n\n' +
    'Constants.expoConfig.extra: ' + JSON.stringify(Constants.expoConfig?.extra || {}, null, 2) + '\n\n' +
    'For development:\n' +
    '1. Create a .env file in the project root\n' +
    '2. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY\n' +
    '3. Restart your dev server: npx expo start --clear\n\n' +
    'For production builds:\n' +
    '1. Ensure app.json has environment variables in extra section\n' +
    '2. Run: npx expo prebuild --clean\n' +
    '3. Rebuild your app with: eas build -p android --profile production\n\n' +
    'See .env.example for instructions.';

  console.error(errorMessage);
  throw new Error(errorMessage);
}

console.log('✅ Supabase environment variables validated successfully');

console.log('✅ Supabase environment variables validated successfully');

// 🛡️ Safe client creation with Realtime support
console.log('=== CREATING SUPABASE CLIENT ===');
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

console.log('✅ Supabase client created successfully');

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

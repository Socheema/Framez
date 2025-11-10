import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../utils/supabase";
import { router } from "expo-router";

export const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  isLoaded: false,
  rememberMe: false,

  // Set current session
  setSession: (session) => set({ session, user: session?.user || null }),

  // Load saved session from Supabase (and rememberMe flag)
  loadAuth: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const remember = await AsyncStorage.getItem("rememberMe");

      set({
        session: data.session,
        user: data.session?.user || null,
        isLoaded: true,
        rememberMe: remember === "true",
      });

      // Redirect based on session state
      if (data.session) {
        router.replace("/(tabs)");
      } else {
        router.replace("/login");
      }
    } catch (error) {
      console.error("Auth load error:", error);
      set({ isLoaded: true });
    }
  },

  // Save user preference for remembering session
  setRememberMe: async (value) => {
    set({ rememberMe: value });
    await AsyncStorage.setItem("rememberMe", value ? "true" : "false");
  },

  // Logout and clear session
  logout: async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem("rememberMe");
      set({ session: null, user: null });
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  },
}));

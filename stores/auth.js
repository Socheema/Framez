import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { supabase } from '../utils/supabase';

export const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoaded: false,
  error: null,
  isPasswordRecovery: false, // Track if this is a password recovery session

  // ✅ Load saved session when app starts
  loadAuth: async () => {
    try {
      // Try to get session from Supabase (this checks AsyncStorage too)
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session load error:', error);
        set({ session: null, user: null, profile: null, isLoaded: true, isPasswordRecovery: false });
        return;
      }

      if (data?.session) {
        // Check if this is a password recovery session
        // Supabase sets a recovery token when user clicks the magic link
        const isRecovery = data.session.user.aud === 'authenticated' &&
                          (data.session.user.recovery_sent_at ||
                           data.session.user.user_metadata?.is_recovery);

        // Fetch user profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single();

        set({
          session: data.session,
          user: data.session.user,
          profile: profileData,
          isLoaded: true,
          isPasswordRecovery: isRecovery || false,
        });
      } else {
        set({ session: null, user: null, profile: null, isLoaded: true, isPasswordRecovery: false });
      }
    } catch (error) {
      console.error('Error loading auth:', error);
      set({ session: null, user: null, profile: null, isLoaded: true, isPasswordRecovery: false });
    }
  },

  // ✅ Sign up a new user
  signUp: async ({ name, email, password }) => {
    try {
      set({ error: null });

      // 🔍 Check if email already exists in the database
      const normalizedEmail = email.trim().toLowerCase();

      const { data: existingUsers, error: queryError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', normalizedEmail)
        .limit(1);

      if (queryError) {
        console.error('Error checking existing email:', queryError);
        // Continue with signup if query fails (don't block user)
      }

      // If email exists, show clear message
      if (existingUsers && existingUsers.length > 0) {
        const errorMsg = 'An account with this email already exists. Please log in.';
        set({ error: errorMsg });
        return {
          success: false,
          error: errorMsg
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          set({ error: 'An account with this email already exists. Please log in.' });
          return {
            success: false,
            error: 'An account with this email already exists. Please log in.'
          };
        }
        set({ error: error.message });
        return { success: false, error: error.message };
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        return {
          success: true,
          requiresVerification: true,
          message: 'Please check your email to verify your account before signing in.'
        };
      }

      // If auto-confirmed, set session
      if (data.session) {
        set({
          session: data.session,
          user: data.user,
        });

        // Fetch the newly created profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        set({ profile: profileData });

        return {
          success: true,
          requiresVerification: false,
          message: 'Account created successfully!'
        };
      }

      return { success: true, requiresVerification: true };
    } catch (error) {
      console.error('Sign-up error:', error);
      set({ error: error.message });
      return { success: false, error: error.message };
    }
  },

  // ✅ Sign in existing user
  signIn: async ({ email, password }) => {
    try {
      set({ error: null });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        let errorMessage = 'Login failed. Please try again.';

        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email before signing in.';
        } else {
          errorMessage = error.message;
        }

        set({ error: errorMessage });
        return { success: false, error: errorMessage };
      }

      if (!data?.session || !data?.user) {
        set({ error: 'Login failed. No session created.' });
        return { success: false, error: 'Login failed. Please try again.' };
      }

      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      set({
        session: data.session,
        user: data.user,
        profile: profileData,
        error: null
      });

      return {
        success: true,
        message: 'Welcome back!'
      };
    } catch (error) {
      console.error('Sign-in error:', error);
      set({ error: 'Network error. Please check your connection.' });
      return {
        success: false,
        error: 'Network error. Please check your connection.'
      };
    }
  },

  // ✅ Log out user
  logout: async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem('session');
      set({
        session: null,
        user: null,
        profile: null,
        error: null,
        isPasswordRecovery: false, // Clear recovery flag
      });
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  },

  // Clear password recovery flag
  clearPasswordRecovery: () => set({ isPasswordRecovery: false }),

  // Set password recovery flag (used when user lands on password reset page)
  setPasswordRecovery: (value) => set({ isPasswordRecovery: value }),

  // ✅ Update user profile
  updateProfile: async (updates) => {
    try {
      const userId = get().user?.id;
      if (!userId) return { success: false, error: 'Not authenticated' };

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      set({ profile: data });
      return { success: true, data };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  },

  // ✅ Clear errors
  clearError: () => set({ error: null }),
}));

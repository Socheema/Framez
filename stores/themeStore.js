import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { DARK_THEME, LIGHT_THEME } from '../constants/theme';

const THEME_STORAGE_KEY = '@framez_theme_mode';

export const useThemeStore = create((set, get) => ({
  // State
  isDarkMode: false,
  theme: LIGHT_THEME,
  isLoading: true,

  // Actions

  /**
   * Initialize theme from storage
   */
  loadTheme: async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const isDark = savedTheme === 'dark';

      set({
        isDarkMode: isDark,
        theme: isDark ? DARK_THEME : LIGHT_THEME,
        isLoading: false,
      });

      console.log('✅ Theme loaded:', isDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Error loading theme:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Toggle between light and dark mode
   */
  toggleTheme: async () => {
    const currentMode = get().isDarkMode;
    const newMode = !currentMode;

    try {
      // Save to storage
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode ? 'dark' : 'light');

      // Update state
      set({
        isDarkMode: newMode,
        theme: newMode ? DARK_THEME : LIGHT_THEME,
      });

      console.log('✅ Theme switched to:', newMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  },

  /**
   * Set theme explicitly
   */
  setTheme: async (isDark) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');

      set({
        isDarkMode: isDark,
        theme: isDark ? DARK_THEME : LIGHT_THEME,
      });

      console.log('✅ Theme set to:', isDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  },

  /**
   * Get current theme colors
   */
  getColors: () => {
    return get().theme.colors;
  },
}));

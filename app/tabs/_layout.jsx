import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../stores/auth';
import { useThemeStore } from '../../stores/themeStore';

export default function TabLayout() {
  const { session, isLoaded } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  // Dynamic styles based on theme
  const styles = StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    tabBar: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      // Height and paddingBottom are dynamically set in getTabBarStyle()
      paddingTop: 8,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    tabBarItem: {
      paddingTop: 8,
    },
    // Android-specific icon positioning adjustment (move up 20px)
    iconContainerAndroid: {
      transform: [{ translateY: -20 }],
    },
    // Floating button wrapper
    floatingButtonWrapper: {
      position: 'absolute',
      // Top position is dynamically set via inline style in component
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    // Floating button inner
    floatingButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    floatingButtonActive: {
      backgroundColor: theme.colors.primaryDark,
      transform: [{ scale: 0.95 }],
    },
  });

  // 🔒 Protect tabs - redirect to login if not authenticated
  useEffect(() => {
    if (isLoaded && !session) {
      console.log('⚠️ Unauthorized access to tabs - redirecting to login');
      router.replace('/login');
    }
  }, [session, isLoaded]);

  // Show loading while checking authentication
  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Don't render tabs if no session (while redirecting)
  if (!session) {
    return null;
  }

  // Calculate platform-specific tab bar styles
  const getTabBarStyle = () => {
    if (Platform.OS === 'ios') {
      // iOS: Use safe area insets for devices with home indicator
      return {
        ...styles.tabBar,
        height: 65 + insets.bottom,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
      };
    } else {
      // Android: Add extra padding to clear system navigation buttons
      return {
        ...styles.tabBar,
        height: 80, // Taller to accommodate navigation buttons
        paddingBottom: 16, // Extra padding to prevent overlap
      };
    }
  };

  // Calculate floating button position based on platform
  const getFloatingButtonTop = () => {
    if (Platform.OS === 'ios') {
      // iOS: Position relative to tab bar with safe area consideration
      return insets.bottom > 0 ? -32 : -28;
    } else {
      // Android: Position higher to clear navigation buttons
      return -40; // More negative = higher up
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textLight,
        tabBarShowLabel: false,
        tabBarStyle: getTabBarStyle(),
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      {/* Feed Tab */}
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, focused }) => (
            <View style={Platform.OS === 'android' ? styles.iconContainerAndroid : null}>
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={28}
                color={color}
              />
            </View>
          ),
        }}
      />

      {/* Create Tab - Floating Button */}
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ focused }) => (
            <View style={[
              styles.floatingButtonWrapper,
              { top: getFloatingButtonTop() }
            ]}>
              <View
                style={[
                  styles.floatingButton,
                  focused && styles.floatingButtonActive,
                ]}
              >
                <Ionicons name="add" size={32} color="#fff" />
              </View>
            </View>
          ),
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={Platform.OS === 'android' ? styles.iconContainerAndroid : null}>
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={28}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

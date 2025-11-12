import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { theme } from '../../constants/theme';
import { useAuthStore } from '../../stores/auth';

export default function TabLayout() {
  const { session, isLoaded } = useAuthStore();
  const router = useRouter();

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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.textLight,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      {/* Feed Tab */}
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={28}
              color={color}
            />
          ),
        }}
      />

      {/* Create Tab - Floating Button */}
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: ({ focused }) => (
            <View style={styles.floatingButtonWrapper}>
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
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={28}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tabBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray,
    height: Platform.OS === "ios" ? 88 : 65,
    paddingBottom: Platform.OS === "ios" ? 28 : 8,
    paddingTop: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabBarItem: {
    paddingTop: 8,
  },
  // Floating button wrapper
  floatingButtonWrapper: {
    position: "absolute",
    top: Platform.OS === "ios" ? -28 : -32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  // Floating button inner
  floatingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  floatingButtonActive: {
    backgroundColor: theme.colors.primaryDark,
    transform: [{ scale: 0.95 }],
  },
});

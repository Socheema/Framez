import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { theme } from '../constants/theme';
import { hp, wp } from '../helpers/common';
import { useAuthStore } from '../stores/auth';
import { useMessageStore } from '../stores/messageStore';
import { useThemeStore } from '../stores/themeStore';

export default function FloatingMessageButton() {
  const { user } = useAuthStore();
  const messageStore = useMessageStore();
  const { unreadCount } = messageStore;
  const { theme: currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  // Load unread count when component mounts
  useEffect(() => {
    if (user?.id) {
      messageStore.loadConversations(user.id);
    }
  }, [user?.id]);

  // Subscribe to real-time conversation updates
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(() => {
      messageStore.loadConversations(user.id);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [user?.id]);

  const handlePress = () => {
    messageStore.toggleConversationModal();
  };

  const styles = useMemo(() => StyleSheet.create({
    floatingButton: {
      position: 'absolute',
      bottom: hp(13.5),
      right: wp(5),
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
      zIndex: 999,
    },
    badge: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    badgeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.rose,
    },
  }), [colors]);

  return (
    <TouchableOpacity
      style={styles.floatingButton}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Ionicons name="chatbubble" size={24} color="white" />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
        </View>
      )}
    </TouchableOpacity>
  );
}


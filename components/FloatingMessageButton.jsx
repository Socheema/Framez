import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const subscriptionRef = useRef(null);

  // Load unread count and subscribe to updates when component mounts
  useEffect(() => {
    if (user?.id) {
      // Initial load
      messageStore.refreshUnreadCount(user.id);

      // Subscribe to real-time message updates
      subscriptionRef.current = messageStore.subscribeToAllMessages(user.id);
    }

    return () => {
      // Cleanup subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
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
      top: -4,
      right: -4,
      backgroundColor: theme.colors.rose,
      borderRadius: 12,
      minWidth: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
      borderWidth: 2,
      borderColor: colors.background,
    },
    badgeText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700',
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
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}


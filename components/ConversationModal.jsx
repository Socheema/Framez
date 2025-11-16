import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { theme } from '../constants/theme';
import { hp, wp } from '../helpers/common';
import { useAuthStore } from '../stores/auth';
import { useMessageStore } from '../stores/messageStore';
import { useThemeStore } from '../stores/themeStore';

// Avatar component
const Avatar = ({ userName, avatarUrl, size = 50 }) => {
  const { theme: currentTheme } = useThemeStore();
  const colors = currentTheme.colors;
  const initials = userName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, marginRight: wp(3) }}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
        />
      ) : (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'white', fontWeight: theme.fonts.bold, fontSize: size * 0.4 }}>{initials}</Text>
        </View>
      )}
    </View>
  );
};

// Time ago formatter
const getTimeAgo = (timestamp) => {
  if (!timestamp) return '';

  const now = new Date();
  const time = new Date(timestamp);
  const diff = Math.floor((now - time) / 1000); // seconds

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;

  return time.toLocaleDateString();
};

// Conversation item component
const ConversationItem = ({ conversation, onPress, styles }) => {
  const { otherUser, lastMessage, unreadCount } = conversation;
  const userName = otherUser?.full_name || otherUser?.username || 'User';

  return (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => onPress(conversation)}
      activeOpacity={0.7}
    >
      <Avatar
        userName={userName}
        avatarUrl={otherUser?.avatar_url}
        size={56}
      />

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {userName}
          </Text>
          {lastMessage && (
            <Text style={styles.conversationTime}>
              {getTimeAgo(lastMessage.created_at)}
            </Text>
          )}
        </View>

        <View style={styles.conversationFooter}>
          <Text
            style={[
              styles.conversationMessage,
              unreadCount > 0 && styles.conversationMessageUnread
            ]}
            numberOfLines={1}
          >
            {lastMessage?.text || 'Start a conversation...'}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Empty state component
const EmptyState = ({ colors, styles }) => (
  <View style={styles.emptyContainer}>
    <Ionicons name="chatbubbles-outline" size={80} color={colors.textLight} />
    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Messages Yet</Text>
    <Text style={[styles.emptyText, { color: colors.textLight }]}>
      Start a conversation by visiting a user's profile and tapping the message button.
    </Text>
  </View>
);

export default function ConversationModal({ visible, onClose }) {
  const { user } = useAuthStore();
  const messageStore = useMessageStore();
  const { conversations, loading } = messageStore;
  const { theme: currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: wp(4),
      paddingTop: hp(6),
      paddingBottom: hp(2),
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: hp(2.5),
      fontWeight: theme.fonts.bold,
      color: colors.text,
    },
    headerRight: {
      width: 44,
    },
    list: {
      paddingVertical: hp(1),
    },
    emptyList: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    conversationItem: {
      flexDirection: 'row',
      padding: wp(4),
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + '20',
    },
    avatar: {
      marginRight: wp(3),
    },
    avatarFallback: {
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: 'white',
      fontWeight: theme.fonts.bold,
    },
    conversationContent: {
      flex: 1,
      justifyContent: 'center',
    },
    conversationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    conversationName: {
      fontSize: hp(2),
      fontWeight: theme.fonts.semibold,
      color: colors.text,
      flex: 1,
    },
    conversationTime: {
      fontSize: hp(1.6),
      color: colors.textLight,
      marginLeft: 8,
    },
    conversationFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    conversationMessage: {
      fontSize: hp(1.8),
      color: colors.textLight,
      flex: 1,
    },
    conversationMessageUnread: {
      color: colors.text,
      fontWeight: theme.fonts.semibold,
    },
    unreadBadge: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      minWidth: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
      marginLeft: 8,
    },
    unreadBadgeText: {
      color: 'white',
      fontSize: hp(1.4),
      fontWeight: theme.fonts.bold,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: wp(8),
    },
    emptyTitle: {
      fontSize: hp(2.4),
      fontWeight: theme.fonts.bold,
    },
    emptyText: {
      fontSize: hp(1.8),
      textAlign: 'center',
      lineHeight: hp(2.6),
    },
  }), [colors]);

  useEffect(() => {
    if (visible && user?.id) {
      // Load conversations when modal opens
      messageStore.loadConversations(user.id);
    }
  }, [visible, user?.id]);

  const handleConversationPress = (conversation) => {
    messageStore.openConversation(conversation);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Conversations List */}
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={handleConversationPress}
              styles={styles}
            />
          )}
          contentContainerStyle={
            conversations.length === 0 ? styles.emptyList : styles.list
          }
          ListEmptyComponent={!loading ? <EmptyState colors={colors} styles={styles} /> : null}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}


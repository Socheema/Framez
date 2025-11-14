import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import { hp, wp } from '../helpers/common';
import { useAuthStore } from '../stores/auth';
import { useMessageStore } from '../stores/messageStore';

// Avatar component
const Avatar = ({ userName, avatarUrl, size = 40 }) => {
  const initials = userName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initials}</Text>
        </View>
      )}
    </View>
  );
};

// Time formatter
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

// Message bubble component
const MessageBubble = ({ message, isOwnMessage, showAvatar, otherUser }) => {
  return (
    <View style={[styles.messageRow, isOwnMessage && styles.messageRowOwn]}>
      {!isOwnMessage && showAvatar && (
        <Avatar
          userName={otherUser?.full_name || otherUser?.username || 'User'}
          avatarUrl={otherUser?.avatar_url}
          size={32}
        />
      )}
      {!isOwnMessage && !showAvatar && <View style={styles.avatarSpacer} />}

      <View style={[styles.messageBubble, isOwnMessage && styles.messageBubbleOwn]}>
        <Text style={[styles.messageText, isOwnMessage && styles.messageTextOwn]}>
          {message.text}
        </Text>
        <Text style={[styles.messageTime, isOwnMessage && styles.messageTimeOwn]}>
          {formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
};

export default function MessageModal({ visible, onClose }) {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const messageStore = useMessageStore();
  const { currentConversation, messages, loading } = messageStore;

  const [messageText, setMessageText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef(null);

  const otherUser = currentConversation?.otherUser;
  const userName = otherUser?.full_name || otherUser?.username || 'User';

  // Subscribe to real-time messages
  useEffect(() => {
    if (visible && currentConversation?.id && user?.id) {
      messageStore.subscribeToMessages(currentConversation.id, user.id);

      // Mark messages as read
      messageStore.markAsRead(currentConversation.id, user.id);

      return () => {
        messageStore.unsubscribeFromMessages();
      };
    }
  }, [visible, currentConversation?.id, user?.id]);

  // Monitor keyboard for Android to position input above navigation bar
  useEffect(() => {
    if (Platform.OS === 'android') {
      const keyboardWillShow = Keyboard.addListener('keyboardDidShow', (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      });
      const keyboardWillHide = Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardHeight(0);
      });

      return () => {
        keyboardWillShow.remove();
        keyboardWillHide.remove();
      };
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!messageText.trim() || !currentConversation?.id || !user?.id) return;

    const text = messageText.trim();
    setMessageText('');

    await messageStore.sendMessage(currentConversation.id, user.id, text);

    // Scroll to bottom after sending
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleBack = () => {
    messageStore.backToConversations();
  };

  const renderMessage = ({ item, index }) => {
    const isOwnMessage = item.sender_id === user?.id;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = !prevMessage || prevMessage.sender_id !== item.sender_id;

    return (
      <MessageBubble
        message={item}
        isOwnMessage={isOwnMessage}
        showAvatar={showAvatar}
        otherUser={otherUser}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Avatar
              userName={userName}
              avatarUrl={otherUser?.avatar_url}
              size={36}
            />
            <Text style={styles.headerTitle} numberOfLines={1}>
              {userName}
            </Text>
          </View>

          <View style={styles.headerRight} />
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
        />

        {/* Input */}
        <View style={[
          styles.inputContainer,
          Platform.OS === 'android' && {
            paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 10,
            marginBottom: keyboardHeight > 0 ? 10 : 0,
          }
        ]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={theme.colors.textLight}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !messageText.trim() && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!messageText.trim()}
            >
              <Ionicons
                name="send"
                size={20}
                color={messageText.trim() ? 'white' : theme.colors.textLight}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingTop: hp(6),
    paddingBottom: hp(2),
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: wp(3),
  },
  headerTitle: {
    fontSize: hp(2.2),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
    marginLeft: wp(2),
    flex: 1,
  },
  headerRight: {
    width: 44,
  },
  messagesList: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: hp(1.5),
    alignItems: 'flex-end',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  avatar: {
    marginRight: wp(2),
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
  avatarSpacer: {
    width: 32 + wp(2),
  },
  messageBubble: {
    backgroundColor: theme.colors.gray + '30',
    borderRadius: theme.radius.xl,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    maxWidth: '70%',
  },
  messageBubbleOwn: {
    backgroundColor: theme.colors.primary,
  },
  messageText: {
    fontSize: hp(1.9),
    color: theme.colors.text,
    lineHeight: hp(2.6),
  },
  messageTextOwn: {
    color: 'white',
  },
  messageTime: {
    fontSize: hp(1.3),
    color: theme.colors.textLight,
    marginTop: 4,
  },
  messageTimeOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.gray + '20',
    borderRadius: theme.radius.xxl,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
  },
  input: {
    flex: 1,
    fontSize: hp(1.9),
    color: theme.colors.text,
    maxHeight: hp(12),
    paddingVertical: 0,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: wp(2),
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.gray + '40',
  },
});

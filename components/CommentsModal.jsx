import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { addComment, fetchPostComments } from '../utils/postsServices';

const Avatar = ({ userName, avatarUrl, size = 32 }) => {
  const initials = userName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initials}</Text>
      )}
    </View>
  );
};

const CommentItem = ({ comment }) => {
  const formatTime = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInMinutes = Math.floor((now - past) / 60000);

    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  return (
    <View style={styles.commentItem}>
      <Avatar userName={comment.user_name} avatarUrl={comment.avatar_url} size={32} />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUsername}>{comment.user_name}</Text>
          <Text style={styles.commentTime}>{formatTime(comment.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{comment.text}</Text>
      </View>
    </View>
  );
};

export default function CommentsModal({ visible, onClose, postId, initialCount = 0 }) {
  const { user, profile } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (visible && postId) {
      loadComments();
    }
  }, [visible, postId]);

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

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await fetchPostComments(postId);
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const newComment = await addComment(user.id, postId, commentText);
      setComments(prev => [...prev, newComment]);
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            Comments {comments.length > 0 ? `(${comments.length})` : ''}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Comments List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>No comments yet</Text>
            <Text style={styles.emptySubtext}>Be the first to comment</Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            renderItem={({ item }) => <CommentItem comment={item} />}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.commentsList}
          />
        )}

        {/* Comment Input */}
        <View style={[
          styles.inputContainer,
          Platform.OS === 'android' && {
            paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 10,
            marginBottom: keyboardHeight > 0 ? 10 : 0,
          }
        ]}>
          <Avatar userName={profile?.user_name || user?.email} avatarUrl={profile?.avatar_url} size={32} />
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor={theme.colors.textLight}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={handleAddComment}
            disabled={!commentText.trim() || submitting}
            style={styles.sendButton}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text
                style={[
                  styles.sendButtonText,
                  !commentText.trim() && styles.sendButtonTextDisabled,
                ]}
              >
                Post
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingTop: Platform.OS === 'ios' ? hp(8) : hp(3),
    paddingBottom: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray,
  },
  modalTitle: {
    fontSize: hp(2.2),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
  },
  closeButton: {
    fontSize: hp(3.5),
    color: theme.colors.text,
    fontWeight: theme.fonts.medium,
  },
  commentsList: {
    padding: wp(4),
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: hp(2),
  },
  avatar: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: theme.fonts.semibold,
  },
  commentContent: {
    flex: 1,
    marginLeft: wp(3),
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  commentUsername: {
    fontSize: hp(1.8),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
    marginRight: wp(2),
  },
  commentTime: {
    fontSize: hp(1.5),
    color: theme.colors.textLight,
  },
  commentText: {
    fontSize: hp(1.8),
    color: theme.colors.text,
    lineHeight: hp(2.3),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    marginHorizontal: wp(3),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    backgroundColor: theme.colors.gray,
    borderRadius: theme.radius.xl,
    fontSize: hp(1.8),
    maxHeight: hp(12),
  },
  sendButton: {
    padding: wp(2),
  },
  sendButtonText: {
    fontSize: hp(2),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.primary,
  },
  sendButtonTextDisabled: {
    color: theme.colors.textLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },
  emptyIcon: {
    fontSize: hp(8),
    marginBottom: hp(1.5),
  },
  emptyText: {
    fontSize: hp(2.2),
    fontWeight: theme.fonts.semibold,
    color: theme.colors.text,
    marginBottom: hp(0.5),
  },
  emptySubtext: {
    fontSize: hp(1.8),
    color: theme.colors.textLight,
  },
})

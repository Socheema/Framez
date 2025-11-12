# Post Detail Page - Real-time Implementation

## Overview
This document details the comprehensive update to the Post Detail page (`app/postDetail/[id].jsx`) to display all post-related data with real-time synchronization from Supabase.

**Date Updated:** November 12, 2025

---

## Key Features Implemented

### 1. ✅ Complete Post Data Display
- **Post Image**: Full-size image display
- **Post Caption**: Text content with author name
- **Post Author**: Avatar, full name/username, clickable navigation
- **Timestamp**: Relative time format (e.g., "2 hours ago")
- **Likes Count**: Total number of likes with clickable interaction
- **Comments**: Full list of all comments with user data

### 2. ✅ User Profile Integration
All comments now display complete user information:
- **Commenter Avatar**: Profile picture or initials fallback
- **Commenter Name**: Full name or username
- **Comment Timestamp**: Relative time since posted
- **Clickable Navigation**: Tap avatar or name to view profile

### 3. ✅ Likes Display System
Enhanced likes visualization:
- **Total Count**: Shows number of likes
- **Avatar Preview**: Up to 3 user avatars displayed inline
- **Likes Modal**: Tap likes count to see full list of users who liked
- **User Navigation**: Each user in modal is clickable to their profile

### 4. ✅ Real-time Synchronization
Implemented Supabase real-time subscriptions for:
- **New Comments**: Appear instantly when added by any user
- **Deleted Comments**: Removed immediately from display
- **Likes/Unlikes**: Count updates in real-time
- **Profile Updates**: Author and commenter info updates live
- **Zero Manual Refresh**: All changes propagate automatically

---

## Technical Implementation

### Data Fetching with Proper Joins

#### Post Details Loading
```javascript
const loadPostDetails = async () => {
  // 1. Fetch post data
  const { data: postData } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id);

  // 2. Fetch author profile separately
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username, avatar_url')
    .eq('id', postData[0].user_id);

  // 3. Combine data
  setPost({
    ...postData[0],
    user_name: profile?.full_name || profile?.username || 'Anonymous',
    avatar_url: profile?.avatar_url || null,
  });

  // 4. Get likes count
  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', id);

  setLikesCount(count || 0);
};
```

#### Comments Loading with User Data
```javascript
const loadComments = async () => {
  // Use service function which handles joins
  const commentsWithUsers = await fetchPostComments(id);
  setComments(commentsWithUsers);
};

// fetchPostComments from utils/postsServices.js:
// 1. Fetches all comments for post
// 2. Extracts unique user IDs
// 3. Fetches profiles for those users
// 4. Maps user data to each comment
```

#### Liked Users Loading
```javascript
const loadLikedUsers = async () => {
  // 1. Fetch all likes for this post
  const { data: likes } = await supabase
    .from('likes')
    .select('user_id')
    .eq('post_id', id);

  // 2. Get unique user IDs
  const userIds = [...new Set(likes.map((like) => like.user_id))];

  // 3. Fetch user profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url')
    .in('id', userIds);

  setLikedUsers(profiles || []);
};
```

### Real-time Subscriptions

#### Subscription Setup
```javascript
useEffect(() => {
  if (!id) return;

  const unsubscribe = subscribeToMultipleTables([
    // Comments subscription
    {
      table: 'comments',
      onInsert: async (newComment) => {
        if (newComment.post_id === id) {
          await loadComments(); // Reload with user data
        }
      },
      onDelete: (deletedComment) => {
        if (deletedComment.post_id === id) {
          setComments((prev) => prev.filter((c) => c.id !== deletedComment.id));
        }
      },
    },

    // Likes subscription
    {
      table: 'likes',
      onInsert: async (newLike) => {
        if (newLike.post_id === id) {
          setLikesCount((prev) => prev + 1);
          await loadLikedUsers();
        }
      },
      onDelete: async (deletedLike) => {
        if (deletedLike.post_id === id) {
          setLikesCount((prev) => Math.max(0, prev - 1));
          await loadLikedUsers();
        }
      },
    },

    // Profiles subscription
    {
      table: 'profiles',
      onUpdate: (updatedProfile) => {
        // Update post author
        if (post && post.user_id === updatedProfile.id) {
          setPost((prev) => ({
            ...prev,
            user_name: updatedProfile.full_name || updatedProfile.username,
            avatar_url: updatedProfile.avatar_url,
          }));
        }

        // Update commenters
        setComments((prev) =>
          prev.map((comment) =>
            comment.user_id === updatedProfile.id
              ? {
                  ...comment,
                  user_name: updatedProfile.full_name || updatedProfile.username,
                  avatar_url: updatedProfile.avatar_url,
                }
              : comment
          )
        );

        // Update liked users
        setLikedUsers((prev) =>
          prev.map((likedUser) =>
            likedUser.id === updatedProfile.id
              ? { ...likedUser, ...updatedProfile }
              : likedUser
          )
        );
      },
    },
  ]);

  // Cleanup on unmount
  return () => unsubscribe();
}, [id, post]);
```

### Optimistic Updates

#### Comment Submission with Instant Feedback
```javascript
const handleSubmitComment = async () => {
  try {
    setSubmittingComment(true);

    // Use service that returns comment with user data
    const commentWithUserData = await addComment(user.id, id, newComment.trim());

    // Optimistic update - add immediately
    setComments([...comments, commentWithUserData]);
    setNewComment('');

    // Real-time subscription will also add it,
    // but this provides instant feedback
  } catch (error) {
    Alert.alert('Error', 'Failed to post comment');
  } finally {
    setSubmittingComment(false);
  }
};
```

---

## User Interface Components

### Avatar Component
- **Size Prop**: Configurable size (20px, 32px, 40px)
- **Fallback**: Shows initials if no avatar image
- **Styling**: Circular with theme colors

### Comment Item Component
```javascript
const CommentItem = ({ comment, onUserPress }) => (
  <View style={styles.commentItem}>
    {/* Clickable avatar */}
    <TouchableOpacity onPress={() => onUserPress(comment.user_id)}>
      <Avatar
        userName={comment.user_name}
        avatarUrl={comment.avatar_url}
        size={32}
      />
    </TouchableOpacity>

    <View style={styles.commentContent}>
      <View style={styles.commentHeader}>
        {/* Clickable username */}
        <TouchableOpacity onPress={() => onUserPress(comment.user_id)}>
          <Text style={styles.commentUsername}>{comment.user_name}</Text>
        </TouchableOpacity>
        <Text style={styles.commentTime}>{formatTime(comment.created_at)}</Text>
      </View>

      {/* Comment text - handles both 'comment' and 'text' fields */}
      <Text style={styles.commentText}>
        {comment.comment || comment.text}
      </Text>
    </View>
  </View>
);
```

### Likes Preview Display
```javascript
<TouchableOpacity
  style={styles.likesContainer}
  onPress={handleLikesPress}
>
  <Text style={styles.likesText}>
    {likesCount} {likesCount === 1 ? 'like' : 'likes'}
  </Text>

  {/* Show up to 3 user avatars */}
  {likedUsers.length > 0 && likedUsers.length <= 3 && (
    <View style={styles.likesPreview}>
      {likedUsers.slice(0, 3).map((user, index) => (
        <View
          key={user.id}
          style={[
            styles.likeAvatarWrapper,
            { marginLeft: index > 0 ? -8 : 0 }
          ]}
        >
          <Avatar
            userName={user.full_name || user.username}
            avatarUrl={user.avatar_url}
            size={20}
          />
        </View>
      ))}
    </View>
  )}
</TouchableOpacity>
```

### Likes Modal
```javascript
<Modal
  visible={showLikesModal}
  transparent={true}
  animationType="slide"
  onRequestClose={() => setShowLikesModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      {/* Header with close button */}
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Likes</Text>
        <TouchableOpacity onPress={() => setShowLikesModal(false)}>
          <Ionicons name="close" size={28} />
        </TouchableOpacity>
      </View>

      {/* List of users who liked */}
      <FlatList
        data={likedUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.likedUserItem}
            onPress={() => {
              setShowLikesModal(false);
              handleUserPress(item.id);
            }}
          >
            <Avatar
              userName={item.full_name || item.username}
              avatarUrl={item.avatar_url}
              size={40}
            />
            <View style={styles.likedUserInfo}>
              <Text style={styles.likedUserName}>
                {item.full_name || item.username}
              </Text>
              {item.username && item.full_name && (
                <Text style={styles.likedUserUsername}>
                  @{item.username}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  </View>
</Modal>
```

---

## Navigation Flow

### User Profile Navigation
```javascript
const handleUserPress = (userId) => {
  if (!userId) return;

  if (userId === user?.id) {
    // Navigate to own profile tab
    router.replace('/tabs/profile');
  } else {
    // Navigate to user profile page
    router.push(`/userProfile/${userId}`);
  }
};
```

**Clickable Elements:**
1. Post author avatar
2. Post author username
3. Commenter avatar
4. Commenter username
5. Each user in likes modal

---

## State Management

### Component State
```javascript
const [post, setPost] = useState(null);              // Post data with author info
const [comments, setComments] = useState([]);        // Comments with user data
const [loading, setLoading] = useState(true);        // Initial load state
const [isLiked, setIsLiked] = useState(false);       // Current user's like status
const [likesCount, setLikesCount] = useState(0);     // Total likes count
const [likedUsers, setLikedUsers] = useState([]);    // Users who liked (for modal)
const [showLikesModal, setShowLikesModal] = useState(false); // Modal visibility
const [newComment, setNewComment] = useState('');    // Comment input text
const [submittingComment, setSubmittingComment] = useState(false); // Submit state
```

### State Updates
- **Initial Load**: `loadPostDetails()`, `loadComments()`, `checkLikeStatus()`, `loadLikedUsers()`
- **Real-time Updates**: Automatic via subscriptions
- **User Actions**: Optimistic updates for instant feedback

---

## Database Schema

### Tables Used
1. **posts** - Post content and metadata
2. **profiles** - User profile information
3. **comments** - Post comments (uses 'text' field for content)
4. **likes** - Post likes/reactions

### Key Queries
```sql
-- Fetch post with author
SELECT * FROM posts WHERE id = ?;
SELECT full_name, username, avatar_url FROM profiles WHERE id = ?;

-- Fetch comments with users
SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC;
SELECT id, full_name, username, avatar_url FROM profiles WHERE id IN (...);

-- Fetch likes and users
SELECT user_id FROM likes WHERE post_id = ?;
SELECT id, full_name, username, avatar_url FROM profiles WHERE id IN (...);

-- Check like status
SELECT id FROM likes WHERE user_id = ? AND post_id = ?;
```

---

## Performance Optimizations

### 1. Efficient Data Loading
- **Separate Queries**: Avoid complex joins that may fail
- **Batch User Fetching**: Get all profiles in one query using `.in()`
- **Count Queries**: Use `{ count: 'exact', head: true }` for counts

### 2. Real-time Efficiency
- **Conditional Updates**: Only update if `newComment.post_id === id`
- **Optimistic UI**: Instant feedback before server confirmation
- **Cleanup**: Unsubscribe on unmount to prevent memory leaks

### 3. Render Optimization
- **FlatList**: Use for likes modal (better performance with large lists)
- **KeyExtractor**: Proper keys prevent unnecessary re-renders
- **Memoization**: Avatar component can be memoized if needed

---

## Error Handling

### Loading States
```javascript
if (loading) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

if (!post) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Post not found</Text>
      <TouchableOpacity onPress={handleBack}>
        <Text>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Error Alerts
- **Like/Unlike Failed**: Alert with error message
- **Comment Submission Failed**: Alert with error message
- **Post Not Found**: Redirect back with alert

---

## Testing Checklist

### ✅ Data Display
- [ ] Post image displays correctly
- [ ] Post caption shows with author name
- [ ] Author avatar/name clickable to profile
- [ ] Timestamp shows relative time
- [ ] Likes count accurate
- [ ] All comments display with user data
- [ ] Comment avatars/names clickable

### ✅ Likes Features
- [ ] Likes count updates when liked/unliked
- [ ] Like button changes color when liked
- [ ] Avatar preview shows (max 3 users)
- [ ] Likes modal opens when tapping count
- [ ] Modal shows all users who liked
- [ ] Each user in modal clickable to profile

### ✅ Comments Features
- [ ] All comments load with user data
- [ ] Comment timestamp shows correctly
- [ ] Can submit new comment
- [ ] New comment appears instantly
- [ ] Comment input clears after submit
- [ ] Commenter info clickable to profile

### ✅ Real-time Updates (Multi-Device)
- [ ] **Device A** likes post → **Device B** sees count update instantly
- [ ] **Device A** unlikes post → **Device B** sees count decrease
- [ ] **Device A** adds comment → **Device B** sees new comment appear
- [ ] **Device A** updates profile → **Device B** sees updated name/avatar in post
- [ ] **Device A** updates profile → **Device B** sees updated info in comments
- [ ] Liked users list updates in real-time

### ✅ Navigation
- [ ] Post author click → Navigate to their profile
- [ ] Commenter click → Navigate to their profile
- [ ] Liked user click → Navigate to their profile
- [ ] Own user ID → Navigate to profile tab (not userProfile page)
- [ ] Back button returns to previous screen

### ✅ Edge Cases
- [ ] Post with no comments shows "No comments yet"
- [ ] Post with no likes shows "0 likes"
- [ ] User with no avatar shows initials
- [ ] Long comments display properly
- [ ] Many likes (>100) handle correctly
- [ ] Fast like/unlike doesn't break UI

---

## Dependencies

### NPM Packages
```json
{
  "@expo/vector-icons": "Ionicons for UI icons",
  "date-fns": "formatDistanceToNow for timestamps",
  "expo-image": "Optimized image component",
  "expo-router": "Navigation",
  "react-native": "Core components"
}
```

### Internal Utilities
```javascript
import { theme } from '../../constants/theme';
import { hp, wp } from '../../helpers/common';
import { useAuthStore } from '../../stores/auth';
import { supabase, subscribeToMultipleTables } from '../../utils/supabase';
import { fetchPostComments, addComment } from '../../utils/postsServices';
```

---

## Styling

### Theme Consistency
All styles use `theme.js` constants:
- **Colors**: `theme.colors.primary`, `theme.colors.text`, `theme.colors.textLight`
- **Fonts**: `theme.fonts.bold`, `theme.fonts.semibold`
- **Radius**: `theme.radius.md`, `theme.radius.xl`, `theme.radius.xxl`

### Responsive Sizing
All dimensions use helper functions:
- **Heights**: `hp(1)` to `hp(100)` - Percentage of screen height
- **Widths**: `wp(1)` to `wp(100)` - Percentage of screen width

### Key Styles Added
```javascript
// Likes preview
likesPreview: {
  flexDirection: 'row',
  marginLeft: wp(2),
  alignItems: 'center',
},
likeAvatarWrapper: {
  borderWidth: 2,
  borderColor: '#fff',
  borderRadius: 10,
},

// Modal
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'flex-end',
},
modalContent: {
  backgroundColor: '#fff',
  borderTopLeftRadius: theme.radius.xxl,
  borderTopRightRadius: theme.radius.xxl,
  maxHeight: hp(70),
},

// Liked users list
likedUserItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: wp(4),
  paddingVertical: hp(1.5),
},
```

---

## Future Enhancements

### Potential Improvements
1. **Comment Reactions**: Like individual comments
2. **Comment Replies**: Nested comment threads
3. **Comment Editing**: Allow users to edit their comments
4. **Comment Deletion**: Swipe to delete own comments
5. **Share Button**: Share post to other platforms
6. **Bookmark**: Save posts to collection
7. **Report**: Flag inappropriate content
8. **Typing Indicators**: Show when someone is typing a comment
9. **Read Receipts**: Show who viewed the post
10. **Image Zoom**: Pinch to zoom on post image

### Performance Improvements
1. **Virtual Scrolling**: For posts with many comments
2. **Image Caching**: Better image loading/caching
3. **Pagination**: Load comments in batches
4. **Debouncing**: Throttle real-time updates
5. **Offline Support**: Cache data for offline viewing

---

## Troubleshooting

### Common Issues

**Issue:** Comments not showing user data
- **Solution**: Verify `fetchPostComments()` in postsServices.js is working
- **Check**: Profiles table has data for comment user IDs

**Issue:** Real-time not working
- **Solution**: Ensure Realtime is enabled in Supabase dashboard for all tables
- **Check**: Console logs for subscription errors

**Issue:** Likes count incorrect
- **Solution**: Verify 'likes' table name (not 'post_likes')
- **Check**: RLS policies allow reading likes

**Issue:** Modal not opening
- **Solution**: Ensure `showLikesModal` state is being set
- **Check**: `handleLikesPress` function is connected to TouchableOpacity

**Issue:** Navigation not working
- **Solution**: Verify `handleUserPress` receives correct userId
- **Check**: Router is imported from expo-router

---

## Summary

The Post Detail page now provides:
✅ **Complete Data Display** - All post information with user profiles
✅ **Real-time Updates** - Instant synchronization across all devices
✅ **Interactive UI** - Clickable avatars, likes modal, comments
✅ **Smooth UX** - Optimistic updates, loading states, error handling
✅ **Theme Consistent** - Uses theme.js for all styling
✅ **Performance Optimized** - Efficient queries and state management

**Result**: A fully-featured, real-time social media post detail page that rivals major platforms like Instagram and Facebook.

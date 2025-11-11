# Supabase Realtime Implementation

## Overview
This document explains the Realtime subscription system implemented for automatic feed updates in the Framez Social app.

## Enabled Tables
The following Supabase tables have Realtime enabled and are being monitored:
- **posts** - New posts, updates, and deletions
- **likes** - Like additions and removals
- **comments** - New comments and deletions
- **profiles** - User profile updates (avatar, username, etc.)

## Architecture

### 1. Supabase Client Configuration (`utils/supabase.js`)

#### Realtime Configuration
```javascript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { ... },
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limiting
    },
  },
})
```

#### Subscription Helpers

**`subscribeToTable(table, { onInsert, onUpdate, onDelete })`**
- Subscribes to a single table
- Listens for INSERT, UPDATE, and DELETE events
- Returns unsubscribe function
- Usage:
```javascript
const subscription = subscribeToTable('posts', {
  onInsert: (newPost) => console.log('New post:', newPost),
  onUpdate: (updated, old) => console.log('Updated post:', updated),
  onDelete: (deleted) => console.log('Deleted post:', deleted),
});

// Cleanup
subscription.unsubscribe();
```

**`subscribeToMultipleTables(tables)`**
- Subscribes to multiple tables at once
- Takes array of table configurations
- Returns single cleanup function
- Usage:
```javascript
const unsubscribe = subscribeToMultipleTables([
  { table: 'posts', onInsert: ..., onUpdate: ..., onDelete: ... },
  { table: 'likes', onInsert: ..., onDelete: ... },
]);

// Cleanup all subscriptions
unsubscribe();
```

### 2. Feed Integration (`app/tabs/feed.jsx`)

#### Subscription Lifecycle
```javascript
useEffect(() => {
  // Wait until initial posts are loaded
  if (initialLoad) return;

  const unsubscribe = subscribeToMultipleTables([...]);

  // Cleanup on unmount
  return () => unsubscribe();
}, [initialLoad]);
```

#### Event Handlers

**Posts Table**
- **INSERT**: Fetches fresh post data to include user info, likes, and comments
- **UPDATE**: Updates specific post in state with new data
- **DELETE**: Removes post from state immediately

```javascript
{
  table: 'posts',
  onInsert: async (newPost) => {
    await fetchPosts(false); // Full refresh for complete data
  },
  onUpdate: (updatedPost) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === updatedPost.id ? { ...post, ...updatedPost } : post
      )
    );
  },
  onDelete: (deletedPost) => {
    setPosts(prevPosts => 
      prevPosts.filter(post => post.id !== deletedPost.id)
    );
  },
}
```

**Likes Table**
- **INSERT**: Increments likes_count for the specific post
- **DELETE**: Decrements likes_count for the specific post
- Uses Math.max() to prevent negative counts

```javascript
{
  table: 'likes',
  onInsert: (newLike) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === newLike.post_id 
          ? { ...post, likes_count: (post.likes_count || 0) + 1 }
          : post
      )
    );
  },
  onDelete: (deletedLike) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === deletedLike.post_id 
          ? { ...post, likes_count: Math.max((post.likes_count || 1) - 1, 0) }
          : post
      )
    );
  },
}
```

**Comments Table**
- **INSERT**: Increments comments_count for the specific post
- **DELETE**: Decrements comments_count for the specific post

```javascript
{
  table: 'comments',
  onInsert: (newComment) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === newComment.post_id 
          ? { ...post, comments_count: (post.comments_count || 0) + 1 }
          : post
      )
    );
  },
  onDelete: (deletedComment) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === deletedComment.post_id 
          ? { ...post, comments_count: Math.max((post.comments_count || 1) - 1, 0) }
          : post
      )
    );
  },
}
```

**Profiles Table**
- **UPDATE**: Updates user info (name, avatar) across all posts by that user
- Ensures profile changes reflect immediately in the feed

```javascript
{
  table: 'profiles',
  onUpdate: (updatedProfile) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.user_id === updatedProfile.id 
          ? {
              ...post,
              user_name: updatedProfile.full_name || updatedProfile.username,
              avatar_url: updatedProfile.avatar_url
            }
          : post
      )
    );
  },
}
```

## Performance Optimizations

### 1. **Prevent Duplicate Subscriptions**
- Subscriptions only set up after initial load completes
- `useEffect` dependency array includes `initialLoad` only
- Prevents re-subscription on every render

### 2. **Efficient State Updates**
- Uses functional setState: `setPosts(prevPosts => ...)`
- Only updates affected posts, not entire array
- Avoids unnecessary re-renders

### 3. **Smart Data Fetching**
- New posts trigger full refresh (need user data)
- Likes/comments only update counts (no fetch needed)
- Profile updates only modify user info fields

### 4. **Rate Limiting**
- Configured `eventsPerSecond: 10` in Realtime params
- Prevents overwhelming the client with rapid changes

### 5. **Cleanup on Unmount**
- All subscriptions properly removed when component unmounts
- Prevents memory leaks and ghost listeners

## Benefits

### User Experience
- ✅ **Instant Updates** - New posts appear without refresh
- ✅ **Live Counts** - Likes and comments update in real-time
- ✅ **Profile Sync** - Avatar/name changes reflect immediately
- ✅ **Smooth UX** - No jarring full-page refreshes

### Developer Experience
- ✅ **Clean Code** - Reusable subscription helpers
- ✅ **Easy Debugging** - Console logs for all events
- ✅ **Type Safety** - Clear event payload structures
- ✅ **Maintainable** - Centralized subscription logic

### Performance
- ✅ **Optimized Re-renders** - Only affected posts update
- ✅ **No Polling** - Event-driven, not interval-based
- ✅ **Low Latency** - WebSocket connection for instant updates
- ✅ **Resource Efficient** - Rate limiting prevents overload

## Testing Checklist

- [ ] Open feed on two devices
- [ ] Create new post on device A, verify it appears on device B
- [ ] Like a post on device A, verify count updates on device B
- [ ] Comment on post on device A, verify count updates on device B
- [ ] Update profile picture on device A, verify it updates in posts on device B
- [ ] Close app completely, verify subscriptions clean up
- [ ] Monitor console for subscription logs
- [ ] Check for memory leaks in long-running sessions

## Troubleshooting

### Realtime not working?
1. Verify tables have Realtime enabled in Supabase dashboard
2. Check RLS policies allow reads for authenticated users
3. Confirm WebSocket connection in browser dev tools (Network tab)
4. Look for subscription errors in console logs

### Too many updates?
1. Check `eventsPerSecond` rate limit
2. Verify no duplicate subscriptions
3. Ensure cleanup functions are running

### Stale data?
1. Verify event handlers are updating correct fields
2. Check if fetchPosts() is being called for new posts
3. Confirm setPosts is using functional updates

## Future Enhancements

1. **Optimistic UI for Comments** - Show comment immediately before server confirmation
2. **Presence Tracking** - Show who's currently viewing the feed
3. **Typing Indicators** - Real-time typing status in comments
4. **Message Editing** - Live edit propagation
5. **Notification System** - Toast notifications for relevant events

## References

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [React Hooks Best Practices](https://react.dev/reference/react/hooks)

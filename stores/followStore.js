
import { create } from 'zustand';
import {
  followUser,
  getFollowerCount,
  getFollowingCount,
  isFollowing,
  unfollowUser,
} from '../utils/followsService';

export const useFollowStore = create((set, get) => ({
  // State
  followingMap: {}, // { userId: boolean } - tracks who current user is following
  followerCounts: {}, // { userId: number } - cache of follower counts
  followingCounts: {}, // { userId: number } - cache of following counts
  loading: false,
  error: null,

  // Actions

  /**
   * Follow a user with optimistic updates
   */
  followUser: async (currentUserId, targetUserId) => {
    // Optimistic update - update UI immediately
    set((state) => ({
      followingMap: {
        ...state.followingMap,
        [targetUserId]: true,
      },
      followerCounts: {
        ...state.followerCounts,
        [targetUserId]: (state.followerCounts[targetUserId] || 0) + 1,
      },
      followingCounts: {
        ...state.followingCounts,
        [currentUserId]: (state.followingCounts[currentUserId] || 0) + 1,
      },
    }));

    try {
      const result = await followUser(currentUserId, targetUserId);

      // If result is null, it means already following (duplicate)
      if (result === null) {
        console.log('Already following, UI already updated');
        return true;
      }

      return true;
    } catch (error) {
      console.error('Error in followUser:', error);

      // Revert optimistic update on error
      set((state) => ({
        followingMap: {
          ...state.followingMap,
          [targetUserId]: false,
        },
        followerCounts: {
          ...state.followerCounts,
          [targetUserId]: Math.max((state.followerCounts[targetUserId] || 0) - 1, 0),
        },
        followingCounts: {
          ...state.followingCounts,
          [currentUserId]: Math.max((state.followingCounts[currentUserId] || 0) - 1, 0),
        },
        error: error.message,
      }));

      return false;
    }
  },

  /**
   * Unfollow a user with optimistic updates
   */
  unfollowUser: async (currentUserId, targetUserId) => {
    // Optimistic update - update UI immediately
    set((state) => ({
      followingMap: {
        ...state.followingMap,
        [targetUserId]: false,
      },
      followerCounts: {
        ...state.followerCounts,
        [targetUserId]: Math.max((state.followerCounts[targetUserId] || 0) - 1, 0),
      },
      followingCounts: {
        ...state.followingCounts,
        [currentUserId]: Math.max((state.followingCounts[currentUserId] || 0) - 1, 0),
      },
    }));

    try {
      await unfollowUser(currentUserId, targetUserId);
      return true;
    } catch (error) {
      console.error('Error in unfollowUser:', error);

      // Revert optimistic update on error
      set((state) => ({
        followingMap: {
          ...state.followingMap,
          [targetUserId]: true,
        },
        followerCounts: {
          ...state.followerCounts,
          [targetUserId]: (state.followerCounts[targetUserId] || 0) + 1,
        },
        followingCounts: {
          ...state.followingCounts,
          [currentUserId]: (state.followingCounts[currentUserId] || 0) + 1,
        },
        error: error.message,
      }));

      return false;
    }
  },

  /**
   * Check if current user is following target user
   */
  checkFollowStatus: async (currentUserId, targetUserId) => {
    try {
      const following = await isFollowing(currentUserId, targetUserId);

      set((state) => ({
        followingMap: {
          ...state.followingMap,
          [targetUserId]: following,
        },
      }));

      return following;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  },

  /**
   * Load follower count for a user
   */
  loadFollowerCount: async (userId) => {
    try {
      const count = await getFollowerCount(userId);

      set((state) => ({
        followerCounts: {
          ...state.followerCounts,
          [userId]: count,
        },
      }));

      return count;
    } catch (error) {
      console.error('Error loading follower count:', error);
      return 0;
    }
  },

  /**
   * Load following count for a user
   */
  loadFollowingCount: async (userId) => {
    try {
      const count = await getFollowingCount(userId);

      set((state) => ({
        followingCounts: {
          ...state.followingCounts,
          [userId]: count,
        },
      }));

      return count;
    } catch (error) {
      console.error('Error loading following count:', error);
      return 0;
    }
  },

  /**
   * Load all follow data for a user (counts + follow status)
   */
  loadUserFollowData: async (currentUserId, targetUserId) => {
    try {
      set({ loading: true, error: null });

      const [followerCount, followingCount, followStatus] = await Promise.all([
        getFollowerCount(targetUserId),
        getFollowingCount(targetUserId),
        currentUserId !== targetUserId
          ? isFollowing(currentUserId, targetUserId)
          : Promise.resolve(false),
      ]);

      set((state) => ({
        followerCounts: {
          ...state.followerCounts,
          [targetUserId]: followerCount,
        },
        followingCounts: {
          ...state.followingCounts,
          [targetUserId]: followingCount,
        },
        followingMap: {
          ...state.followingMap,
          [targetUserId]: followStatus,
        },
        loading: false,
      }));

      return { followerCount, followingCount, followStatus };
    } catch (error) {
      console.error('Error loading user follow data:', error);
      set({ error: error.message, loading: false });
      return null;
    }
  },

  /**
   * Get cached follow status
   */
  isFollowing: (targetUserId) => {
    return get().followingMap[targetUserId] || false;
  },

  /**
   * Get cached follower count
   */
  getFollowerCount: (userId) => {
    return get().followerCounts[userId] || 0;
  },

  /**
   * Get cached following count
   */
  getFollowingCount: (userId) => {
    return get().followingCounts[userId] || 0;
  },

  /**
   * Handle real-time follow insert event
   */
  handleFollowInsert: (follow) => {
    set((state) => ({
      followerCounts: {
        ...state.followerCounts,
        [follow.following_id]: (state.followerCounts[follow.following_id] || 0) + 1,
      },
      followingCounts: {
        ...state.followingCounts,
        [follow.follower_id]: (state.followingCounts[follow.follower_id] || 0) + 1,
      },
    }));
  },

  /**
   * Handle real-time follow delete event
   */
  handleFollowDelete: (follow) => {
    set((state) => ({
      followerCounts: {
        ...state.followerCounts,
        [follow.following_id]: Math.max((state.followerCounts[follow.following_id] || 0) - 1, 0),
      },
      followingCounts: {
        ...state.followingCounts,
        [follow.follower_id]: Math.max((state.followingCounts[follow.follower_id] || 0) - 1, 0),
      },
      followingMap: {
        ...state.followingMap,
        [follow.following_id]: follow.follower_id === get().currentUserId ? false : state.followingMap[follow.following_id],
      },
    }));
  },

  /**
   * Clear error
   */
  clearError: () => set({ error: null }),

  /**
   * Reset store
   */
  reset: () =>
    set({
      followingMap: {},
      followerCounts: {},
      followingCounts: {},
      loading: false,
      error: null,
    }),
}));

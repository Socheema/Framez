
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
  // Track pending follow/unfollow actions per target userId to prevent rapid taps
  pendingTargets: {}, // { targetUserId: boolean }

  // Actions

  /**
   * Follow a user with optimistic updates
   */
  followUser: async (currentUserId, targetUserId) => {
    // Prevent duplicate in-flight actions
    if (get().pendingTargets[targetUserId]) return true;

    // Optimistic: only flip following state; let counts sync via realtime or refresh after success
    set((state) => ({
      followingMap: {
        ...state.followingMap,
        [targetUserId]: true,
      },
      pendingTargets: {
        ...state.pendingTargets,
        [targetUserId]: true,
      },
    }));

    try {
      const result = await followUser(currentUserId, targetUserId);

      // Check for errors with null-safety
      if (result?.error) {
        throw result.error;
      }

      // Refresh counts from server to ensure accuracy
      const [followers, following] = await Promise.all([
        getFollowerCount(targetUserId),
        getFollowingCount(currentUserId),
      ]);

      set((state) => ({
        followerCounts: {
          ...state.followerCounts,
          [targetUserId]: followers,
        },
        followingCounts: {
          ...state.followingCounts,
          [currentUserId]: following,
        },
      }));

      return true;
    } catch (error) {
      console.error('Error in followUser:', error);

      // Revert optimistic update on error
      set((state) => ({
        followingMap: {
          ...state.followingMap,
          [targetUserId]: false,
        },
        error: error.message,
      }));

      return false;
    } finally {
      // Clear pending flag
      set((state) => ({
        pendingTargets: {
          ...state.pendingTargets,
          [targetUserId]: false,
        },
      }));
    }
  },

  /**
   * Unfollow a user with optimistic updates
   */
  unfollowUser: async (currentUserId, targetUserId) => {
    // Prevent duplicate in-flight actions
    if (get().pendingTargets[targetUserId]) return true;

    // Optimistic: only flip following state; let counts sync via realtime or refresh after success
    set((state) => ({
      followingMap: {
        ...state.followingMap,
        [targetUserId]: false,
      },
      pendingTargets: {
        ...state.pendingTargets,
        [targetUserId]: true,
      },
    }));

    try {
      const result = await unfollowUser(currentUserId, targetUserId);

      // Check for errors with null-safety
      if (result?.error) {
        throw result.error;
      }

      // Refresh counts from server to ensure accuracy
      const [followers, following] = await Promise.all([
        getFollowerCount(targetUserId),
        getFollowingCount(currentUserId),
      ]);

      set((state) => ({
        followerCounts: {
          ...state.followerCounts,
          [targetUserId]: followers,
        },
        followingCounts: {
          ...state.followingCounts,
          [currentUserId]: following,
        },
      }));

      return true;
    } catch (error) {
      console.error('Error in unfollowUser:', error);

      // Revert optimistic update on error
      set((state) => ({
        followingMap: {
          ...state.followingMap,
          [targetUserId]: true,
        },
        error: error.message,
      }));

      return false;
    } finally {
      // Clear pending flag
      set((state) => ({
        pendingTargets: {
          ...state.pendingTargets,
          [targetUserId]: false,
        },
      }));
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
   * Check if follow/unfollow is pending for a target
   */
  isPending: (targetUserId) => {
    return !!get().pendingTargets[targetUserId];
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
      pendingTargets: {},
    }),
}));

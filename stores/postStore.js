import { create } from 'zustand';

export const usePostsStore = create((set, get) => ({
  // State
  posts: [],
  loading: false,
  error: null,

  // Actions
  setPosts: (posts) => set({ posts, error: null }),

  addPost: (post) => set((state) => {
    // Prevent duplicate posts with same ID
    const isDuplicate = state.posts.some(p => p && p.id === post.id);
    if (isDuplicate) {
      console.warn('[PostStore] Duplicate post detected, skipping:', post.id);
      return state;
    }
    return {
      posts: [post, ...state.posts],
      error: null
    };
  }),

  updatePost: (postId, updates) => set((state) => ({
    posts: state.posts.map((post) =>
      post.id === postId ? { ...post, ...updates } : post
    ),
  })),

  deletePost: (postId) => set((state) => ({
    posts: state.posts.filter((post) => post.id !== postId),
  })),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  // Clear all posts
  clearPosts: () => set({ posts: [], error: null }),
}));

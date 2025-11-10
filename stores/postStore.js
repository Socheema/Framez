import { create } from 'zustand';

export const usePostsStore = create((set, get) => ({
  // State
  posts: [],
  loading: false,
  error: null,

  // Actions
  setPosts: (posts) => set({ posts, error: null }),

  addPost: (post) => set((state) => ({
    posts: [post, ...state.posts],
    error: null
  })),

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

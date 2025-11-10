import { create } from 'zustand';

const useUserStore = create((set) => ({
  // State
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Actions
  setUser: (userData) => set({ 
    user: userData, 
    isAuthenticated: true,
    isLoading: false 
  }),
  
  clearUser: () => set({ 
    user: null, 
    isAuthenticated: false,
    isLoading: false 
  }),
  
  setLoading: (loading) => set({ isLoading: loading }),
}));

export default useUserStore;


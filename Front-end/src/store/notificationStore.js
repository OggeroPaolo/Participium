import { create } from 'zustand';

const useNotificationStore = create((set) => ({
  notifications: [],
  isRealtimeConnected: false,
  lastEvent: null,

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50),
      lastEvent: notification,
    })),

  replaceNotifications: (notifications) =>
    set({
      notifications,
    }),

  clearNotifications: () =>
    set({
      notifications: [],
      lastEvent: null,
    }),

  setRealtimeConnected: (isConnected) =>
    set({
      isRealtimeConnected: isConnected,
    }),
}));

export default useNotificationStore;



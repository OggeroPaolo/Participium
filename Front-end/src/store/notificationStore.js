import { create } from 'zustand';

const useNotificationStore = create((set) => ({
  notifications: [],
  isRealtimeConnected: false,
  lastEvent: null,

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          ...notification,
          isRead: Boolean(notification.isRead),
        },
        ...state.notifications,
      ].slice(0, 50),
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

  markNotificationAsRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      ),
    })),
}));

export default useNotificationStore;



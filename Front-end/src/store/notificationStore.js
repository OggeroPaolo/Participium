import { create } from 'zustand';

const useNotificationStore = create((set) => ({
  notifications: [],
  isRealtimeConnected: false,
  lastEvent: null,
  unreadByReport: {},

  addNotification: (notification) =>
    set((state) => {
      if (state.notifications.some((item) => item.id === notification.id)) {
        return state;
      }

      const unreadByReport =
        notification.reportId != null
          ? {
              ...state.unreadByReport,
              [notification.reportId]:
                (state.unreadByReport[notification.reportId] || 0) + 1,
            }
          : state.unreadByReport;

      return {
        notifications: [
          {
            ...notification,
            isRead: Boolean(notification.isRead),
          },
          ...state.notifications,
        ].slice(0, 50),
        lastEvent: notification,
        unreadByReport,
      };
    }),

  replaceNotifications: (notifications) =>
    set(() => {
      const unreadList = (notifications || [])
        .filter((notification) => !notification.isRead)
        .map((notification) => ({
          ...notification,
          isRead: false,
        }))
        .slice(0, 50);

      const unreadByReport = unreadList.reduce((acc, notification) => {
        if (notification.reportId != null) {
          acc[notification.reportId] = (acc[notification.reportId] || 0) + 1;
        }
        return acc;
      }, {});

      return {
        notifications: unreadList,
        unreadByReport,
      };
    }),

  clearNotifications: () =>
    set({
      notifications: [],
      lastEvent: null,
      unreadByReport: {},
    }),

  setRealtimeConnected: (isConnected) =>
    set({
      isRealtimeConnected: isConnected,
    }),

  markNotificationAsRead: (notificationId) =>
    set((state) => {
      const notification = state.notifications.find(
        (item) => item.id === notificationId
      );

      const unreadByReport = { ...state.unreadByReport };
      if (notification?.reportId && unreadByReport[notification.reportId]) {
        unreadByReport[notification.reportId] -= 1;
        if (unreadByReport[notification.reportId] <= 0) {
          delete unreadByReport[notification.reportId];
        }
      }

      return {
        notifications: state.notifications.filter(
          (item) => item.id !== notificationId
        ),
        unreadByReport,
      };
    }),
}));

export const markReportNotificationsAsRead = (reportId) => {
  useNotificationStore.setState((state) => {
    const remaining = state.notifications.filter(
      (notification) => notification.reportId !== reportId
    );

    const unreadByReport = { ...state.unreadByReport };
    delete unreadByReport[reportId];

    return {
      notifications: remaining,
      unreadByReport,
    };
  });
};

export default useNotificationStore;



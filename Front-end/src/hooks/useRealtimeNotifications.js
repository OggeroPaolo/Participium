import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL, getNotifications } from '../API/API';
import { getBearerToken } from '../firebaseService';
import useUserStore from '../store/userStore';
import useNotificationStore from '../store/notificationStore';

export function useRealtimeNotifications() {
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const userUid = useUserStore((state) => state.user?.uid);

  const addNotification = useNotificationStore((state) => state.addNotification);
  const replaceNotifications = useNotificationStore(
    (state) => state.replaceNotifications
  );
  const clearNotifications = useNotificationStore(
    (state) => state.clearNotifications
  );
  const setRealtimeConnected = useNotificationStore(
    (state) => state.setRealtimeConnected
  );

  const socketRef = useRef(null);

  useEffect(() => {
    let isDisposed = false;

    const loadNotifications = async () => {
      if (!isAuthenticated || !userUid) {
        replaceNotifications([]);
        return;
      }

      try {
        const notifications = await getNotifications({ includeRead: true });
        if (!isDisposed) {
          replaceNotifications(notifications);
        }
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };

    const connect = async () => {
      if (!isAuthenticated || !userUid) {
        return;
      }

      try {
        const token = await getBearerToken();
        if (isDisposed) {
          return;
        }

        const socket = io(API_BASE_URL, {
          transports: ['websocket'],
          autoConnect: false,
          auth: {
            token,
          },
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          setRealtimeConnected(true);
        });

        socket.on('notifications:ready', (payload) => {
          replaceNotifications([]);
          if (payload?.message) {
            addNotification({
              id: `ready-${Date.now()}`,
              type: 'system',
              title: 'Realtime channel ready',
              message: payload.message,
              createdAt: new Date().toISOString(),
            });
          }
        });

        socket.on('notifications:new', (notification) => {
          if (notification && typeof notification === 'object') {
            addNotification(notification);
          }
        });

        socket.on('connect_error', (error) => {
          console.error('Realtime connection error:', error);
        });

        socket.on('disconnect', () => {
          setRealtimeConnected(false);
        });

        socket.connect();
      } catch (error) {
        console.error('Failed to initialize realtime channel:', error);
      }
    };

    loadNotifications();
    connect();

    return () => {
      isDisposed = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setRealtimeConnected(false);
      if (!isAuthenticated) {
        clearNotifications();
      }
    };
  }, [
    isAuthenticated,
    userUid,
    addNotification,
    replaceNotifications,
    clearNotifications,
    setRealtimeConnected,
  ]);
}


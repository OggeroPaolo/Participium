import { useMemo, useState } from "react";
import { Dropdown, Badge, Nav, Spinner } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router";
import useNotificationStore from "../store/notificationStore";
import useUserStore from "../store/userStore";
import { markNotificationRead } from "../API/API";

function NotificationBell() {
  const notifications = useNotificationStore((state) => state.notifications);
  const isRealtimeConnected = useNotificationStore(
    (state) => state.isRealtimeConnected
  );
  const markNotificationAsRead = useNotificationStore(
    (state) => state.markNotificationAsRead
  );
  const userRole = useUserStore((state) => state.user?.role_type);
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingNotificationId, setPendingNotificationId] = useState(null);

  const latestNotifications = useMemo(
    () => notifications.slice(0, 5),
    [notifications]
  );

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const getDestinationForNotification = (notification) => {
    if (!notification?.reportId) {
      return null;
    }

    const reportId = notification.reportId;

    switch (userRole) {
      case "tech_officer":
        return `/tech-assigned-reports?reportId=${reportId}`;
      case "external_maintainer":
        return `/ext-assigned-reports?reportId=${reportId}`;
      case "pub_relations":
      case "admin":
        return `/review-reports?reportId=${reportId}`;
      default:
        return `/reports/${reportId}`;
    }
  };

  const handleNotificationClick = async (notification) => {
    const destination = getDestinationForNotification(notification);
    if (!destination) {
      return;
    }

    const isSameLocation =
      location.pathname + location.search === destination;

    setPendingNotificationId(notification.id);
    try {
      if (!notification.isRead) {
        await markNotificationRead(notification.id);
        markNotificationAsRead(notification.id);
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    } finally {
      setPendingNotificationId(null);
      if (isSameLocation) {
        navigate(destination, { replace: true });
        window.location.reload();
      } else {
        navigate(destination);
      }
    }
  };

  return (
    <Dropdown align='end' className='notification-bell'>
      <Dropdown.Toggle
        as={Nav.Link}
        className='d-flex align-items-center gap-1 nav-icon-link'
      >
        <i className='bi bi-bell fs-5'></i>
        {unreadCount > 0 && (
          <Badge bg='danger' pill>
            {Math.min(unreadCount, 99)}
          </Badge>
        )}
        <span
          className={`status-dot ${
            isRealtimeConnected ? "text-success" : "text-danger"
          }`}
        >
          ●
        </span>
      </Dropdown.Toggle>

      <Dropdown.Menu className='notifications-dropdown p-2'>
        <Dropdown.Header>Notifications</Dropdown.Header>
        {latestNotifications.length === 0 ? (
          <div className='text-muted small px-2 pb-2'>Nothing to show yet</div>
        ) : (
          latestNotifications.map((notification) => {
            const isUnread = !notification.isRead;
            const isLoading = pendingNotificationId === notification.id;

            return (
              <Dropdown.Item
                as='button'
                key={notification.id}
                className={`notification-item py-2 text-start ${
                  isUnread ? "notification-unread" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
                disabled={isLoading}
              >
                <div className='d-flex justify-content-between align-items-center small text-muted'>
                  <span>{formatTimestamp(notification.createdAt)}</span>
                  {isLoading && (
                    <Spinner animation='border' size='sm' className='ms-2' />
                  )}
                </div>
                <div className='notification-title fw-semibold'>
                  {notification.title ?? notification.type ?? "Update"}
                </div>
                <div className='notification-message small text-body-secondary'>
                  {notification.message ?? "No message provided"}
                </div>
              </Dropdown.Item>
            );
          })
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}

function formatTimestamp(value) {
  if (!value) {
    return "just now";
  }
  try {
    const date = new Date(value);
    return date.toLocaleString();
  } catch {
    return value;
  }
}

export default NotificationBell;

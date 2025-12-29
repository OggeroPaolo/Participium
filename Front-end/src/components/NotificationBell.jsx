import { useMemo } from "react";
import { Dropdown, Badge, Nav } from "react-bootstrap";
import useNotificationStore from "../store/notificationStore";

function NotificationBell() {
  const notifications = useNotificationStore((state) => state.notifications);
  const isRealtimeConnected = useNotificationStore(
    (state) => state.isRealtimeConnected
  );

  const latestNotifications = useMemo(
    () => notifications.slice(0, 5),
    [notifications]
  );

  const count = notifications.length;

  return (
    <Dropdown align='end' className='notification-bell'>
      <Dropdown.Toggle
        as={Nav.Link}
        className='d-flex align-items-center gap-1 nav-icon-link'
      >
        <i className='bi bi-bell fs-5'></i>
        {count > 0 && (
          <Badge bg='danger' pill>
            {Math.min(count, 99)}
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
          latestNotifications.map((notification) => (
            <div key={notification.id} className='notification-item py-2'>
              <div className='small text-muted'>
                {formatTimestamp(notification.createdAt)}
              </div>
              <div className='fw-semibold'>
                {notification.title ?? notification.type ?? "Update"}
              </div>
              <div className='small text-body-secondary'>
                {notification.message ?? "No message provided"}
              </div>
            </div>
          ))
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

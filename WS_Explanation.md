Backend
    -Realtime gateway (src/realtime/realtimeGateway.ts)
       Built a Socket.IO layer around the existing HTTP server. Every connection is authenticated with the same Firebase tokens used in REST middleware, rooms are created per-user (uid) and per-role (role:<role_name>), and helper methods (notifyUser, notifyRole, broadcast) encapsulate sending  notifications. The gateway also tracks socket IDs so multiple devices per user are handled cleanly and emits an initial notifications:ready event after auth succeeds.

    -Server bootstrap (src/server.ts)
       After calling http.createServer(app), the realtime gateway is initialised once so the WS server shares the Express port. Shutdown flow is unchanged.

    -User lookup refactor (src/dao/UserDAO.ts)
       Introduced a reusable baseSelect query to DRY up repeated SQL and added findUserById, used when emitting notifications to report owners.

    -Report review notification (src/routes/reports.routes.ts)
    When Public Relations officers change a report status to assigned, the route now:
       Persists the status change (existing behaviour).
       Loads the citizen who created the report (userDAO.findUserById(report.user_id)).
       Emits notifyUser(reportOwner.firebase_uid, { type: "report.accepted", title/message/metadata... }).
       This pushes a realtime notification to all devices owned by that user. Failures to send are logged but do not block the HTTP response.
   
Frontend
    -Notification store (src/store/notificationStore.js)
       New Zustand slice tracks notifications, connection status, and the most recent event. Helpers exist to add, replace, clear, and flag online/offline state.
    -Realtime hook (src/hooks/useRealtimeNotifications.js)
       Watches auth state via Zustand: when a user logs in, it fetches a Firebase token, opens a Socket.IO client to API_BASE_URL, listens for notifications:ready and notifications:new, and cleans up on logout or unmount. Each notifications:new payload is dropped into the store. The hook reuses individual selectors so React doesn’t loop infinitely.
    -Header UI (src/components/Header.jsx & NotificationBell.jsx)
       Added a dropdown bell icon visible to logged-in users. It shows a badge count, connection indicator, and a short list of the latest notifications. The component subscribes to each store field individually to avoid the Zustand snapshot warnings.
    
    API export (src/API/API.js)
    Exposed API_BASE_URL so both REST and realtime clients share the same origin string.
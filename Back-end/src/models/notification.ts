import type { NotificationType } from "./notificationType.js";

export interface Notification {
    id: number;
    user_id: number;
    type: NotificationType;
    report_id: number;
    comment_id: number | null;
    title: string;
    message: string | null;
    is_read: number; // 0 or 1 (boolean as integer)
    created_at: string;
}


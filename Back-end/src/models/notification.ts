export interface Notification {
    id: number;
    user_id: number;
    type: 'comment_on_created_report' | 'comment_on_assigned_report' | 'status_update' | 'report_assigned' | 'report_reviewed' | 'report_rejected';
    report_id: number;
    comment_id: number | null;
    title: string;
    message: string | null;
    is_read: number; // 0 or 1 (boolean as integer)
    created_at: string;
}


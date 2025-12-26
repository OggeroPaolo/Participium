export type CreateNotificationDTO = {
    user_id: number;
    type: string;
    report_id: number;
    comment_id?: number | null;
    title: string;
    message?: string | null;
}

export type NotificationWithRelationsDTO = {
    id: number;
    user_id: number;
    type: string;
    report_id: number;
    comment_id: number | null;
    title: string;
    message: string | null;
    is_read: number;
    created_at: string;
    // Related entities
    report?: {
        id: number;
        title: string;
        status: string;
    };
    comment?: {
        id: number;
        text: string;
        timestamp: string;
        user: {
            username: string;
            first_name: string;
            last_name: string;
        };
    };
}


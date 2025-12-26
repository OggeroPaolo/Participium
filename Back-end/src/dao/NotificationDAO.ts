import type { Notification } from '../models/notification.js';
import type { CreateNotificationDTO, NotificationWithRelationsDTO } from '../dto/NotificationDTO.js';
import { Update, getAll, getOne } from '../config/database.js';

export default class NotificationDAO {
    async createNotification(data: CreateNotificationDTO): Promise<Notification> {
        const sql = `
            INSERT INTO notifications (
                user_id, type, report_id, comment_id, title, message
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            data.user_id,
            data.type,
            data.report_id,
            data.comment_id ?? null,
            data.title,
            data.message ?? null
        ];
        
        const result = await Update(sql, params);
        if (!result.lastID) {
            throw new Error("Notification creation failed");
        }
        
        const notification = await this.getNotificationById(result.lastID);
        if (!notification) {
            throw new Error("Notification created but issue with retrieving it");
        }
        
        return notification;
    }
    
    async getNotificationById(id: number): Promise<Notification | undefined> {
        const sql = `SELECT * FROM notifications WHERE id = ?`;
        return await getOne<Notification>(sql, [id]);
    }
    
    async getNotificationsByUserId(userId: number, includeRead: boolean = true): Promise<NotificationWithRelationsDTO[]> {
        const whereClause = includeRead 
            ? 'WHERE n.user_id = ?'
            : 'WHERE n.user_id = ? AND n.is_read = 0';
        
        const sql = `
            SELECT 
                n.id,
                n.user_id,
                n.type,
                n.report_id,
                n.comment_id,
                n.title,
                n.message,
                n.is_read,
                n.created_at,
                r.id as report_id_full,
                r.title as report_title,
                r.status as report_status,
                c.id as comment_id_full,
                c.text as comment_text,
                c.timestamp as comment_timestamp,
                u.username as comment_username,
                u.first_name as comment_first_name,
                u.last_name as comment_last_name
            FROM notifications n
            LEFT JOIN reports r ON n.report_id = r.id
            LEFT JOIN comments c ON n.comment_id = c.id
            LEFT JOIN users u ON c.user_id = u.id
            ${whereClause}
            ORDER BY n.created_at DESC
        `;
        
        const notifications = await getAll<any>(sql, [userId]);
        
        // Transform to DTO format
        return notifications.map((n: any) => ({
            id: n.id,
            user_id: n.user_id,
            type: n.type,
            report_id: n.report_id,
            comment_id: n.comment_id,
            title: n.title,
            message: n.message,
            is_read: n.is_read,
            created_at: n.created_at,
            report: n.report_id_full ? {
                id: n.report_id_full,
                title: n.report_title,
                status: n.report_status
            } : undefined,
            comment: n.comment_id_full ? {
                id: n.comment_id_full,
                text: n.comment_text,
                timestamp: n.comment_timestamp,
                user: {
                    username: n.comment_username,
                    first_name: n.comment_first_name,
                    last_name: n.comment_last_name
                }
            } : undefined
        }));
    }
    
    async markAsRead(notificationId: number, userId: number): Promise<void> {
        const sql = `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`;
        const result = await Update(sql, [notificationId, userId]);
        if (result.changes === 0) {
            throw new Error("Notification not found or user mismatch");
        }
    }
    
    async markAllAsRead(userId: number): Promise<void> {
        const sql = `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`;
        await Update(sql, [userId]);
    }
    
    async getUnreadCount(userId: number): Promise<number> {
        const sql = `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`;
        const result = await getOne<{ count: number }>(sql, [userId]);
        return result?.count ?? 0;
    }
}


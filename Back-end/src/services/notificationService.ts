import NotificationDAO from "../dao/NotificationDAO.js";
import UserDAO from "../dao/UserDAO.js";
import type { CreateNotificationDTO } from "../dto/NotificationDTO.js";
import { getRealtimeGateway } from "../realtime/realtimeGateway.js";
import { logger } from "../config/logger.js";
import type { Notification } from "../models/notification.js";

class NotificationService {
  private readonly notificationDAO = new NotificationDAO();
  private readonly userDAO = new UserDAO();

  async createAndDispatch(data: CreateNotificationDTO): Promise<Notification> {
    const notification = await this.notificationDAO.createNotification(data);

    try {
      const user = await this.userDAO.findUserById(notification.user_id);
      if (user?.firebase_uid) {
        getRealtimeGateway().notifyUser(user.firebase_uid, {
          type: "notification.created",
          title: notification.title,
          message: notification.message ?? "",
          notification,
          createdAt: notification.created_at,
        });
      }
    } catch (error) {
      logger.warn(
        { error, notificationId: notification.id },
        "Failed to emit realtime notification"
      );
    }

    return notification;
  }
}

export const notificationService = new NotificationService();


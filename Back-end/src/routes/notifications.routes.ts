import { Router } from "express";
import type { Request, Response } from "express";
import { param, validationResult } from "express-validator";
import type { User } from "../models/user.js"
import { ROLES } from "../models/userRoles.js";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js";
import NotificationDAO from "../dao/NotificationDAO.js";

const router = Router();
const notificationDAO = new NotificationDAO();

// sets the is_read flag to true for a notificaiton with id = notificationId
router.patch("/notifications/:notificationId/set-read",
    verifyFirebaseToken([ROLES.TECH_OFFICER, ROLES.EXT_MAINTAINER, ROLES.CITIZEN, ROLES.PUB_RELATIONS, ROLES.ADMIN]),
    param("notificationId").isInt().withMessage("Notificaiton ID must be a valid integer"),
    async (req: Request, res: Response) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            //Extract the validation error messages 
            const extractedErrors = errors.array().map(err => err.msg);
            return res.status(400).json({ errors: extractedErrors });
        }

        try {

            const notificationId = Number(req.params.notificationId);
            const user = (req as Request & { user: User }).user;

            const notification =  await notificationDAO.getNotificationById(notificationId);

            if (!notification) {
                return res.status(404).json({ error: "Notification not found" });
            }

            // check if notificaiton belongs to the user calling the api
            if (notification?.user_id !== user.id) {
                return res.status(403).json({ error: "You cannot set as read notificaitons of another user" });
            }
            // set is_read to true
            await notificationDAO.markAsRead(notificationId, user.id)

            return res.status(200).json({
                message: "Notification is_read set to true successfully"
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

// GET /notifications
router.get(
  "/notifications",
  verifyFirebaseToken([
    ROLES.TECH_OFFICER,
    ROLES.EXT_MAINTAINER,
    ROLES.CITIZEN,
    ROLES.PUB_RELATIONS
  ]),
  async (req: Request, res: Response) => {
    try {
      const user = (req as Request & { user: User }).user;

      // default: include anche quelle lette
      const includeReadParam = req.query.includeRead as string | undefined;
      const includeRead =
        includeReadParam === undefined
          ? true
          : includeReadParam === "true" || includeReadParam === "1";

      const notifications = await notificationDAO.getNotificationsByUserId(
        user.id,
        includeRead
      );

      if (!notifications.length) {
        return res.status(204).send();
      }

      return res.status(200).json({ notifications });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;

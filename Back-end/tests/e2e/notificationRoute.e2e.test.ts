import request from "supertest";
import { Express } from "express";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import notificationRouter from "../../src/routes/notifications.routes.js";
import { makeTestApp, initTestDB, resetTestDB } from "../setup/tests_util.js";
import NotificationDAO from "../../src/dao/NotificationDAO.js";
import { ROLES } from "../../src/models/userRoles.js";

// ---------------------------
// Mock Firebase middleware
// ---------------------------
const mockCitizen = { id: 1, role_type: ROLES.CITIZEN, roles: [ROLES.CITIZEN] };

vi.mock("../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (_roles: string[]) => (req: any, _res: any, next: any) => {
    req.user = mockCitizen;
    next();
  },
}));

describe("Notification (E2E)", () => {
  let app: Express;

  const existingNotificationId = 1; // seeded notification for Citizen
  const otherUserNotificationId = 2; // seeded notification for Tech officer

  beforeAll(async () => {
    await initTestDB();
    app = makeTestApp(notificationRouter);
  });

  afterEach(async () => {
    await resetTestDB();
    vi.restoreAllMocks();
  });

  describe("PATCH /notifications/:notificationId/set-read", () => {
    it("should mark notification as read and return 200", async () => {
      const res = await request(app)
        .patch(`/notifications/${existingNotificationId}/set-read`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: "Notification is_read set to true successfully",
      });
    });

    it("should return 400 if notificationId is invalid", async () => {
      const res = await request(app)
        .patch("/notifications/abc/set-read");

      expect(res.status).toBe(400);
      expect(res.body.errors).toContain(
        "Notificaiton ID must be a valid integer"
      );
    });

    it("should return 404 if notification does not exist", async () => {
      const res = await request(app)
        .patch("/notifications/99999/set-read");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Notification not found" });
    });

    it("should return 403 if notification belongs to another user", async () => {
      const res = await request(app)
        .patch(`/notifications/${otherUserNotificationId}/set-read`);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: "You cannot set as read notificaitons of another user",
      });
    });

    it("should return 500 if DAO throws", async () => {
      vi.spyOn(NotificationDAO.prototype, "getNotificationById")
        .mockRejectedValueOnce(new Error("DB failure"));

      const res = await request(app)
        .patch(`/notifications/${existingNotificationId}/set-read`);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });
    });
  });
});

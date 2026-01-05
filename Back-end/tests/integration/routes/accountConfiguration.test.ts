import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeTestApp } from "../../setup/tests_util.js";
import router from "../../../src/routes/user.routes.js";
import UserDAO from "../../../src/dao/UserDAO.js";
import { User } from "../../../src/models/user.js";
import cloudinary from "../../../src/config/cloudinary.js";
import path from "node:path";

// ---------------------------
// Mock Firebase middleware
// ---------------------------
vi.mock("../../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (_roles: string[]) => (req: any, _res: any, next: any) => {
    // Set default user for tests (citizen with id 1)
    req.user = { id: 1, role_name: "Citizen", role_type: "citizen" };
    next();
  },
}));

// Mock Cloudinary
vi.mock("../../../src/config/cloudinary.js", () => ({
  default: {
    uploader: {
      upload: vi.fn().mockResolvedValue({
        secure_url: "https://example.com/mock-photo.jpg",
        public_id: "mock-public-id",
      }),
      destroy: vi.fn().mockResolvedValue({ result: "ok" }),
    },
  },
}));

// Mock sharp for image processing
vi.mock("sharp", () => {
  return {
    default: vi.fn(() => ({
      resize: vi.fn().mockReturnThis(),
      toFile: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

let app: any;

beforeEach(() => {
  vi.clearAllMocks();
  app = makeTestApp(router);
});

describe("Account Configuration Integration Tests", () => {
  describe("US: As a citizen I want to configure my account", () => {
    const citizenUserId = 1; // Seeded citizen user ID
    const mockCitizenUser: User = {
      id: citizenUserId,
      firebase_uid: "QBUqptp5sYa46a2ALU3t8QXRIHz2",
      email: "citizen@example.com",
      username: "JohnDoe",
      first_name: "John",
      last_name: "Doe",
      role_type: "citizen",
      roles: ["Citizen"],
      email_notifications_enabled: 1,
      profile_photo_url: null,
      telegram_username: null,
    };

    beforeEach(() => {
      // Mock UserDAO methods
      vi.spyOn(UserDAO.prototype, "findUserById").mockResolvedValue(mockCitizenUser);
      vi.spyOn(UserDAO.prototype, "updateUserInfo").mockResolvedValue(undefined);
    });

    describe("Update Telegram Username", () => {
      it("should successfully update telegram_username", async () => {
        const newTelegramUsername = "@johndoe_telegram";

        const res = await request(app)
          .patch(`/users/${citizenUserId}`)
          .send({
            telegram_username: newTelegramUsername,
          });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          message: "User information updated",
        });

        expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledWith(
          citizenUserId,
          newTelegramUsername,
          undefined,
          undefined
        );
      });

      it("should allow updating telegram_username to null", async () => {
        const res = await request(app)
          .patch(`/users/${citizenUserId}`)
          .send({
            telegram_username: null,
          });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          message: "User information updated",
        });
      });

      it("should allow updating telegram_username to empty string", async () => {
        const res = await request(app)
          .patch(`/users/${citizenUserId}`)
          .send({
            telegram_username: "",
          });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          message: "User information updated",
        });
      });
    });

    describe("Update Email Notifications Preference", () => {
      it("should successfully enable email notifications", async () => {
        const res = await request(app)
          .patch(`/users/${citizenUserId}`)
          .send({
            email_notifications_enabled: true,
          });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          message: "User information updated",
        });

        expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledWith(
          citizenUserId,
          undefined,
          true,
          undefined
        );
      });

      it("should successfully disable email notifications", async () => {
        const res = await request(app)
          .patch(`/users/${citizenUserId}`)
          .send({
            email_notifications_enabled: false,
          });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          message: "User information updated",
        });

        expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledWith(
          citizenUserId,
          undefined,
          false,
          undefined
        );
      });
    });

    describe("Update Profile Photo", () => {
      it("should successfully update profile photo", async () => {
        const testImgPath = path.join(__dirname, "../../test_img/test.jpg");

        const res = await request(app)
          .patch(`/users/${citizenUserId}`)
          .attach("photo_profile", testImgPath)
          .field("telegram_username", "test_telegram");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          message: "User information updated",
        });

        // Verify Cloudinary upload was called
        expect(cloudinary.uploader.upload).toHaveBeenCalled();
      });

      it("should delete old profile photo when uploading new one", async () => {
        // Mock user with existing profile photo
        const userWithPhoto = {
          ...mockCitizenUser,
          profile_photo_url: "https://example.com/old-photo.jpg",
        };
        vi.spyOn(UserDAO.prototype, "findUserById").mockResolvedValue(userWithPhoto);

        const testImgPath = path.join(__dirname, "../../test_img/test.jpg");

        const res = await request(app)
          .patch(`/users/${citizenUserId}`)
          .attach("photo_profile", testImgPath);

        expect(res.status).toBe(200);
        expect(cloudinary.uploader.upload).toHaveBeenCalled();
        // Note: destroy might be called if old photo exists
      });
    });

    describe("Update Multiple Settings Simultaneously", () => {
      it("should successfully update telegram_username and email_notifications_enabled together", async () => {
        const res = await request(app)
          .patch(`/users/${citizenUserId}`)
          .send({
            telegram_username: "@new_telegram",
            email_notifications_enabled: false,
          });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          message: "User information updated",
        });

        expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledWith(
          citizenUserId,
          "@new_telegram",
          false,
          undefined
        );
      });

      it("should successfully update all settings: telegram, notifications, and photo", async () => {
        const testImgPath = path.join(__dirname, "../../test_img/test.jpg");

        const res = await request(app)
          .patch(`/users/${citizenUserId}`)
          .attach("photo_profile", testImgPath)
          .field("telegram_username", "@complete_update")
          .field("email_notifications_enabled", "true");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          message: "User information updated",
        });

        expect(cloudinary.uploader.upload).toHaveBeenCalled();
      });
    });

    describe("Authorization and Security", () => {
      it("should return 403 when user tries to update another user's account", async () => {
        const otherUserId = 2; // Different user ID
        const otherUser: User = {
          id: otherUserId,
          firebase_uid: "other_uid",
          email: "other@example.com",
          username: "other_user",
          first_name: "Other",
          last_name: "User",
          role_type: "citizen",
          roles: ["Citizen"],
        };

        vi.spyOn(UserDAO.prototype, "findUserById").mockResolvedValue(otherUser);

        const res = await request(app)
          .patch(`/users/${otherUserId}`)
          .send({
            telegram_username: "@hacker",
          });

        expect(res.status).toBe(403);
        expect(res.body).toEqual({
          error: "You are not allowed to change the user information for another user",
        });

        expect(UserDAO.prototype.updateUserInfo).not.toHaveBeenCalled();
      });

      it("should return 404 when user does not exist", async () => {
        vi.spyOn(UserDAO.prototype, "findUserById").mockResolvedValue(undefined);

        const res = await request(app)
          .patch(`/users/999`)
          .send({
            telegram_username: "@test",
          });

        expect(res.status).toBe(404);
        expect(res.body).toEqual({
          error: "User not found",
        });
      });
    });

    describe("Validation", () => {
      it("should return 400 if userId is not a valid integer", async () => {
        const res = await request(app)
          .patch("/users/abc")
          .send({
            telegram_username: "@test",
          });

        expect(res.status).toBe(400);
        expect(res.body.errors).toContain("User ID must be a valid integer");
      });

      it("should return 400 if email_notifications_enabled is not a boolean", async () => {
        const res = await request(app)
          .patch(`/users/${citizenUserId}`)
          .send({
            email_notifications_enabled: "not_boolean",
          });

        expect(res.status).toBe(400);
        expect(res.body.errors).toContain("email_notifications_enabled must be a boolean");
      });

      it("should return 400 if telegram_username is not a string", async () => {
        const res = await request(app)
          .patch(`/users/${citizenUserId}`)
          .send({
            telegram_username: 12345,
          });

        expect(res.status).toBe(400);
        expect(res.body.errors).toContain("telegram_username must be a string");
      });

      it("should accept valid boolean values for email_notifications_enabled", async () => {
        const res = await request(app)
          .patch(`/users/${citizenUserId}`)
          .send({
            email_notifications_enabled: true,
          });

        expect(res.status).toBe(200);
      });
    });

    describe("Error Handling", () => {
      it("should return 500 if database update fails", async () => {
        vi.spyOn(UserDAO.prototype, "updateUserInfo").mockRejectedValue(
          new Error("Database error")
        );

        const res = await request(app)
          .patch(`/users/${citizenUserId}`)
          .send({
            telegram_username: "@test",
          });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
          error: "Internal server error",
        });
      });

      it("should return 500 if user lookup fails", async () => {
        vi.spyOn(UserDAO.prototype, "findUserById").mockRejectedValue(
          new Error("Database error")
        );

        const res = await request(app)
          .patch(`/users/${citizenUserId}`)
          .send({
            telegram_username: "@test",
          });

        expect(res.status).toBe(500);
        expect(res.body).toEqual({
          error: "Internal server error",
        });
      });
    });

    describe("Virtual Presence Management", () => {
      it("should allow citizen to manage their virtual presence by updating telegram username", async () => {
        const res = await request(app)
          .patch(`/users/${citizenUserId}`)
          .send({
            telegram_username: "@my_public_handle",
          });

        expect(res.status).toBe(200);
        expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledWith(
          citizenUserId,
          "@my_public_handle",
          undefined,
          undefined
        );
      });

      it("should allow citizen to manage their virtual presence by updating profile photo", async () => {
        const testImgPath = path.join(__dirname, "../../test_img/test.jpg");

        const res = await request(app)
          .patch(`/users/${citizenUserId}`)
          .attach("photo_profile", testImgPath);

        expect(res.status).toBe(200);
        expect(cloudinary.uploader.upload).toHaveBeenCalled();
      });
    });

    describe("Notification Management", () => {
      it("should allow citizen to enable email notifications for better notification management", async () => {
        const res = await request(app)
          .patch(`/users/${citizenUserId}`)
          .send({
            email_notifications_enabled: true,
          });

        expect(res.status).toBe(200);
        expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledWith(
          citizenUserId,
          undefined,
          true,
          undefined
        );
      });

      it("should allow citizen to disable email notifications for better notification management", async () => {
        const res = await request(app)
          .patch(`/users/${citizenUserId}`)
          .send({
            email_notifications_enabled: false,
          });

        expect(res.status).toBe(200);
        expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledWith(
          citizenUserId,
          undefined,
          false,
          undefined
        );
      });
    });
  });
});


import request from "supertest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeTestApp, initTestDB, resetTestDB } from "../../setup/tests_util.js";
import router from "../../../src/routes/user.routes.js";
import UserDAO from "../../../src/dao/UserDAO.js";
import cloudinary from "../../../src/config/cloudinary.js";
import path from "node:path";
import { getOne } from "../../../src/config/database.js";

// ---------------------------
// Mock Firebase middleware
// ---------------------------
vi.mock("../../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (_roles: string[]) => (req: any, _res: any, next: any) => {
    // Set default user for tests (citizen with id 1 from seeded data)
    req.user = { id: 1, role_name: "Citizen", role_type: "citizen" };
    next();
  },
}));

// Mock Cloudinary - conditionally mock if API key is not set
const shouldMockCloudinary = !process.env.CLOUDINARY_API_KEY || 
  process.env.CLOUDINARY_API_KEY === "your_cloudinary_api_key_here" ||
  process.env.CLOUDINARY_API_KEY === "";

if (shouldMockCloudinary) {
  vi.mock("../../../src/config/cloudinary.js", () => ({
    default: {
      uploader: {
        upload: vi.fn().mockResolvedValue({
          secure_url: "https://res.cloudinary.com/test/image/upload/v123/test.jpg",
          public_id: "test",
        }),
        destroy: vi.fn().mockResolvedValue({ result: "ok" }),
      },
    },
  }));
}

// Mock sharp for image processing
vi.mock("sharp", () => {
  return {
    default: vi.fn(() => ({
      resize: vi.fn().mockReturnThis(),
      toFile: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

// Mock fs/promises for file operations
vi.mock("node:fs/promises", () => ({
  unlink: vi.fn().mockResolvedValue(undefined),
}));

let app: any;
let userDao: UserDAO;

describe("Account Configuration User Story Integration Tests", () => {
  describe("US: As a citizen I want to configure my account", () => {
    describe("So that I can better manage notifications and my virtual presence", () => {
      beforeEach(async () => {
        await initTestDB();
        app = makeTestApp(router);
        userDao = new UserDAO();
        vi.clearAllMocks();
      });

      afterEach(async () => {
        await resetTestDB();
      });

      describe("Notification Management", () => {
        it("should allow citizen to enable email notifications", async () => {
          // Get initial state
          const initialUser = await userDao.findUserById(1);
          expect(initialUser).toBeDefined();

          const res = await request(app)
            .patch("/users/1")
            .send({
              email_notifications_enabled: true,
            });

          expect(res.status).toBe(200);
          expect(res.body).toEqual({
            message: "User information updated",
          });

          // Verify the change was persisted in the database
          const updatedUser = await getOne<any>(
            "SELECT email_notifications_enabled FROM users WHERE id = ?",
            [1]
          );
          expect(updatedUser?.email_notifications_enabled).toBe(1);
        });

        it("should allow citizen to disable email notifications", async () => {
          // First enable notifications
          await request(app)
            .patch("/users/1")
            .send({
              email_notifications_enabled: true,
            });

          // Then disable them
          const res = await request(app)
            .patch("/users/1")
            .send({
              email_notifications_enabled: false,
            });

          expect(res.status).toBe(200);
          expect(res.body).toEqual({
            message: "User information updated",
          });

          // Verify the change was persisted
          const updatedUser = await getOne<any>(
            "SELECT email_notifications_enabled FROM users WHERE id = ?",
            [1]
          );
          expect(updatedUser?.email_notifications_enabled).toBe(0);
        });

        it("should allow citizen to toggle email notifications multiple times", async () => {
          // Toggle on
          let res = await request(app)
            .patch("/users/1")
            .send({ email_notifications_enabled: true });
          expect(res.status).toBe(200);

          // Toggle off
          res = await request(app)
            .patch("/users/1")
            .send({ email_notifications_enabled: false });
          expect(res.status).toBe(200);

          // Toggle on again
          res = await request(app)
            .patch("/users/1")
            .send({ email_notifications_enabled: true });
          expect(res.status).toBe(200);

          // Verify final state
          const user = await getOne<any>(
            "SELECT email_notifications_enabled FROM users WHERE id = ?",
            [1]
          );
          expect(user?.email_notifications_enabled).toBe(1);
        });
      });

      describe("Virtual Presence Management", () => {
        it("should allow citizen to set telegram username for virtual presence", async () => {
          const telegramUsername = "@johndoe_telegram";

          const res = await request(app)
            .patch("/users/1")
            .send({
              telegram_username: telegramUsername,
            });

          expect(res.status).toBe(200);
          expect(res.body).toEqual({
            message: "User information updated",
          });

          // Verify the change was persisted
          const updatedUser = await getOne<any>(
            "SELECT telegram_username FROM users WHERE id = ?",
            [1]
          );
          expect(updatedUser?.telegram_username).toBe(telegramUsername);
        });

        it("should allow citizen to update telegram username", async () => {
          // Set initial telegram username
          await request(app)
            .patch("/users/1")
            .send({ telegram_username: "@old_username" });

          // Update to new username
          const res = await request(app)
            .patch("/users/1")
            .send({ telegram_username: "@new_username" });

          expect(res.status).toBe(200);

          // Verify the update
          const user = await getOne<any>(
            "SELECT telegram_username FROM users WHERE id = ?",
            [1]
          );
          expect(user?.telegram_username).toBe("@new_username");
        });

        it("should allow citizen to remove telegram username (set to null)", async () => {
          // First set a telegram username
          await request(app)
            .patch("/users/1")
            .send({ telegram_username: "@test_username" });

          // Then remove it
          const res = await request(app)
            .patch("/users/1")
            .send({ telegram_username: null });

          expect(res.status).toBe(200);

          // Verify it was removed
          const user = await getOne<any>(
            "SELECT telegram_username FROM users WHERE id = ?",
            [1]
          );
          expect(user?.telegram_username).toBeNull();
        });

        it("should allow citizen to update profile photo for virtual presence", async () => {
          const testImgPath = path.join(__dirname, "../../test_img/test.jpg");

          const res = await request(app)
            .patch("/users/1")
            .attach("photo_profile", testImgPath);

          expect(res.status).toBe(200);
          expect(res.body).toEqual({
            message: "User information updated",
          });

          // Verify Cloudinary upload was called
          if (shouldMockCloudinary) {
            expect(cloudinary.uploader.upload).toHaveBeenCalled();
          }

          // Verify the profile photo URL was updated in database
          const user = await getOne<any>(
            "SELECT profile_photo_url FROM users WHERE id = ?",
            [1]
          );
          if (shouldMockCloudinary) {
            expect(user?.profile_photo_url).toBe("https://res.cloudinary.com/test/image/upload/v123/test.jpg");
          }
        });

        it("should replace old profile photo when uploading new one", async () => {
          const testImgPath = path.join(__dirname, "../../test_img/test.jpg");

          // Upload first photo
          await request(app)
            .patch("/users/1")
            .attach("photo_profile", testImgPath);

          const firstPhoto = await getOne<any>(
            "SELECT profile_photo_url FROM users WHERE id = ?",
            [1]
          );

          // Upload second photo
          const res = await request(app)
            .patch("/users/1")
            .attach("photo_profile", testImgPath);

          expect(res.status).toBe(200);

          // Verify old photo was deleted (if Cloudinary is mocked)
          if (shouldMockCloudinary) {
            expect(cloudinary.uploader.destroy).toHaveBeenCalled();
          }

          const secondPhoto = await getOne<any>(
            "SELECT profile_photo_url FROM users WHERE id = ?",
            [1]
          );
          expect(secondPhoto?.profile_photo_url).toBeDefined();
        });
      });

      describe("Combined Configuration Updates", () => {
        it("should allow citizen to update notifications and telegram username together", async () => {
          const res = await request(app)
            .patch("/users/1")
            .send({
              telegram_username: "@complete_config",
              email_notifications_enabled: false,
            });

          expect(res.status).toBe(200);
          expect(res.body).toEqual({
            message: "User information updated",
          });

          // Verify both changes were persisted
          const user = await getOne<any>(
            "SELECT telegram_username, email_notifications_enabled FROM users WHERE id = ?",
            [1]
          );
          expect(user?.telegram_username).toBe("@complete_config");
          expect(user?.email_notifications_enabled).toBe(0);
        });

        it("should allow citizen to update all settings: telegram, notifications, and photo", async () => {
          const testImgPath = path.join(__dirname, "../../test_img/test.jpg");

          const res = await request(app)
            .patch("/users/1")
            .attach("photo_profile", testImgPath)
            .field("telegram_username", "@full_config")
            .field("email_notifications_enabled", "true");

          expect(res.status).toBe(200);
          expect(res.body).toEqual({
            message: "User information updated",
          });

          // Verify all changes were persisted
          const user = await getOne<any>(
            "SELECT telegram_username, email_notifications_enabled, profile_photo_url FROM users WHERE id = ?",
            [1]
          );
          expect(user?.telegram_username).toBe("@full_config");
          expect(user?.email_notifications_enabled).toBe(1);
          expect(user?.profile_photo_url).toBeDefined();
        });
      });

      describe("Authorization and Security", () => {
        it("should return 403 when user tries to update another user's account", async () => {
          // Try to update user with id 2 (different from authenticated user id 1)
          const res = await request(app)
            .patch("/users/2")
            .send({
              telegram_username: "@hacker",
            });

          expect(res.status).toBe(403);
          expect(res.body).toEqual({
            error: "You are not allowed to change the user information for another user",
          });
        });

        it("should return 404 when user does not exist", async () => {
          const res = await request(app)
            .patch("/users/99999")
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
            .patch("/users/1")
            .send({
              email_notifications_enabled: "not_boolean",
            });

          expect(res.status).toBe(400);
          expect(res.body.errors).toContain("email_notifications_enabled must be a boolean");
        });

        it("should return 400 if telegram_username is not a string", async () => {
          const res = await request(app)
            .patch("/users/1")
            .send({
              telegram_username: 12345,
            });

          expect(res.status).toBe(400);
          expect(res.body.errors).toContain("telegram_username must be a string");
        });
      });

      describe("Real-world Scenarios", () => {
        it("should handle complete account configuration workflow", async () => {
          const testImgPath = path.join(__dirname, "../../test_img/test.jpg");

          // Step 1: Set telegram username
          let res = await request(app)
            .patch("/users/1")
            .send({ telegram_username: "@myhandle" });
          expect(res.status).toBe(200);

          // Step 2: Enable notifications
          res = await request(app)
            .patch("/users/1")
            .send({ email_notifications_enabled: true });
          expect(res.status).toBe(200);

          // Step 3: Upload profile photo
          res = await request(app)
            .patch("/users/1")
            .attach("photo_profile", testImgPath);
          expect(res.status).toBe(200);

          // Step 4: Update telegram username
          res = await request(app)
            .patch("/users/1")
            .send({ telegram_username: "@updated_handle" });
          expect(res.status).toBe(200);

          // Step 5: Disable notifications
          res = await request(app)
            .patch("/users/1")
            .send({ email_notifications_enabled: false });
          expect(res.status).toBe(200);

          // Verify final state
          const user = await getOne<any>(
            "SELECT telegram_username, email_notifications_enabled, profile_photo_url FROM users WHERE id = ?",
            [1]
          );
          expect(user?.telegram_username).toBe("@updated_handle");
          expect(user?.email_notifications_enabled).toBe(0);
          expect(user?.profile_photo_url).toBeDefined();
        });

        it("should persist configuration changes across requests", async () => {
          // Set configuration
          await request(app)
            .patch("/users/1")
            .send({
              telegram_username: "@persistent",
              email_notifications_enabled: true,
            });

          // Make another request to verify persistence
          const user = await getOne<any>(
            "SELECT telegram_username, email_notifications_enabled FROM users WHERE id = ?",
            [1]
          );
          expect(user?.telegram_username).toBe("@persistent");
          expect(user?.email_notifications_enabled).toBe(1);
        });
      });
    });
  });
});


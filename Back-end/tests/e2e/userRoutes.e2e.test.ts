import request from "supertest";
import { Express } from "express";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import userRouter from "../../src/routes/user.routes.js";
import { makeTestApp, initTestDB, resetTestDB } from "../setup/tests_util.js";
import UserDAO from "../../src/dao/UserDAO.js";
import { ROLES } from "../../src/models/userRoles.js";
import path from "node:path";
import { User } from "../../src/models/user.js";
import cloudinary from "../../src/config/cloudinary.js";


const mockCitizen = { id: 1, role_name: "Citizen", role_type: "citizen" };
const testImg = path.join(__dirname, "../test_img/test.jpg");
vi.mock("../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (roles: string[]) => (req: any, _res: any, next: any) => {
    req.user = mockCitizen; // default
    next();
  },
}));



describe("User (E2E)", () => {
  let app: Express;

  const seededFirebaseUid = "QBUqptp5sYa46a2ALU3t8QXRIHz2";
  const testUserId = 1; // seeded user id

  beforeAll(async () => {
    await initTestDB();
    app = makeTestApp(userRouter);
  });

  afterEach(async () => {
    await resetTestDB();
    vi.restoreAllMocks();
  });

  describe("GET /users/:firebaseUid", () => {
    it("should return user data for an existing firebaseUid", async () => {
      const res = await request(app).get(`/users/${seededFirebaseUid}`);
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({
        firebase_uid: seededFirebaseUid,
        email: "citizen@example.com",
        username: "JohnDoe",
        first_name: "John",
        last_name: "Doe",
        role_type: ROLES.CITIZEN,
        roles: ['Citizen']
      });
    });

    it("should return 404 if user is not found", async () => {
      const res = await request(app).get("/users/nonexistent_uid");
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "User not found" });
    });

    it("should return 400 or 404 if Firebase UID is missing (route not matched)", async () => {
      const res = await request(app).get("/users/");
      expect([400, 404]).toContain(res.status);
    });

    it("should return 500 if the DAO throws an unexpected error", async () => {
      vi.spyOn(UserDAO.prototype, "findUserByUid").mockRejectedValue(new Error("DB failure"));
      const res = await request(app).get(`/users/${seededFirebaseUid}`);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });
    });
  });


  describe("PATCH /users/:userId", () => {

    it("updates user info successfully without file", async () => {
      const res = await request(app)
        .patch(`/users/${testUserId}`)
        .send({
          telegram_username: "new_telegram",
          email_notifications_enabled: true,
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "User information updated" });
    });

    it("returns 403 if user tries to update another user", async () => {
      const res = await request(app)
        .patch(`/users/${testUserId + 1}`)
        .send({ telegram_username: "new_telegram" });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: "You are not allowed to change the user information for another user",
      });
    });

    it("returns 400 if userId is invalid", async () => {
      const res = await request(app)
        .patch("/users/abc")
        .send({ telegram_username: "test" });

      expect(res.status).toBe(400);
      expect(res.body.errors).toContain("User ID must be a valid integer");
    });

    it("returns 400 if email_notifications_enabled is invalid", async () => {
      const res = await request(app)
        .patch(`/users/${testUserId}`)
        .send({ email_notifications_enabled: "not_boolean" });

      expect(res.status).toBe(400);
      expect(res.body.errors).toContain("email_notifications_enabled must be a boolean");
    });

    it("updates user info with uploaded file", async () => {
      // Mock Cloudinary upload
      vi.spyOn(cloudinary.uploader, "upload").mockResolvedValueOnce({
        secure_url: "http://cloud.url/photo.png",
      } as any);
      const res = await request(app)
        .patch(`/users/${testUserId}`)
        .attach("photo_profile", testImg)
        .field("telegram_username", "file_telegram");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "User information updated" });
    });

  });

  it("should return 500", async () => {

    // Force DAO update to throw
    vi.spyOn(UserDAO.prototype, "updateUserInfo").mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .patch(`/users/${testUserId}`)
      .attach("photo_profile", testImg)
      .field("telegram_username", "file_telegram");

    expect(res.status).toBe(500);
  });

});


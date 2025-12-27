import request from "supertest";
import { Express } from "express";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import userRouter from "../../src/routes/user.routes.js";
import { makeTestApp, initTestDB, resetTestDB } from "../setup/tests_util.js";
import UserDAO from "../../src/dao/UserDAO.js";
import { ROLES } from "../../src/models/userRoles.js";

// Mock firebase token verification middleware
vi.mock("../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (_roles: string[]) => (_req: any, _res: any, next: any) => next(),
}));

describe("GET /users/:firebaseUid (E2E)", () => {
  let app: Express;

  // One of the default users seeded in seedDefaultData()
  const seededFirebaseUid = "QBUqptp5sYa46a2ALU3t8QXRIHz2";

  beforeAll(async () => {
    await initTestDB();
    app = makeTestApp(userRouter);
  });

  afterEach(async () => {
    await resetTestDB();
    vi.restoreAllMocks();
  });

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

import request from "supertest";
import { Express } from "express";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import userRouter from "../../src/routes/user.routes.js";
import { makeTestApp } from "../setup/tests_util.js";
import { initTestDB, resetTestDB } from "../setup/tests_util.js"; 

// Mock firebase token verification middleware
vi.mock("../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (_roles: string[]) => (_req: any, _res: any, next: any) => next(),
}));

describe("GET /users/:firebaseUid (E2E)", () => {
  let app: Express;

  // One of the default users seeded in seedDefaultData()
  const seededFirebaseUid = "uid_citizen";

  beforeAll(async () => {
    await initTestDB();
    app = makeTestApp(userRouter);
  });

  afterEach(async () => {
    await resetTestDB();
  });

  it("should return user data for an existing firebaseUid", async () => {
    const res = await request(app).get(`/users/${seededFirebaseUid}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      firebase_uid: seededFirebaseUid,
      first_name: "John",
      last_name: "Doe",
      email: "citizen@example.com",
      username: "citizen_user",
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
});

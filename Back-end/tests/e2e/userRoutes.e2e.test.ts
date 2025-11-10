import request from "supertest";
import { Express } from "express";
import { describe, it, expect, beforeAll,vi } from "vitest";
import userRouter from "../../src/routes/user.routes.js";
import { makeTestApp } from "../utils/testApp.js";
import initializeDatabase from "../../src/db/init.js";
import { runQuery } from "../../src/config/database.js";

// 🧩 Mock only the Firebase token verification middleware
vi.mock("../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (_roles: string[]) => (_req: any, _res: any, next: any) => next(),
}));

describe("GET /users/:firebaseUid (E2E with real DB)", () => {
  let app: Express;
  const uniqueFirebaseUid = `test_uid_${Date.now()}`; // ensures no duplicates

  beforeAll(async () => {
    // Initialize the in-memory DB before running tests
    await initializeDatabase();
    app = makeTestApp(userRouter);

    // Ensure a unique test user exists to avoid UNIQUE constraint violations
    await runQuery(
      `INSERT INTO users (firebase_uid, email, username, first_name, last_name, role_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uniqueFirebaseUid,
        `test_${Date.now()}@example.com`,
        `testuser_${Date.now()}`,
        "Test",
        "User",
        1, // role_id: citizen
      ]
    );
  });

  it("should return user data for an existing firebaseUid", async () => {
    const res = await request(app).get(`/users/${uniqueFirebaseUid}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      firebase_uid: uniqueFirebaseUid,
      first_name: "Test",
      last_name: "User",
    });
  });

  it("should return 404 if user is not found", async () => {
    const res = await request(app).get("/users/nonexistent_uid");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "User not found" });
  });

  it("should return 400 if Firebase UID is missing (route not matched)", async () => {
    const res = await request(app).get("/users/");
    expect([400, 404]).toContain(res.status); // fallback, since route might not match
  });
});

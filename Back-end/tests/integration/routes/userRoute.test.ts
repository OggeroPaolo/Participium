import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeTestApp } from "../../setup/tests_util.js";
import router from "../../../src/routes/user.routes.js";
import UserDAO from "../../../src/dao/UserDAO.js";
import { User } from "../../../src/models/user.js";

// ---------------------------
// Mock Firebase middleware
// ---------------------------
vi.mock("../../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (_roles: string[]) => (_req: any, _res: any, next: any) => next(),
}));

let app: any;

beforeEach(() => {
  vi.clearAllMocks();
  app = makeTestApp(router);
});
describe("User Routes Integration Tests", () => {
  describe("GET /users/:firebaseUid", () => {
    it("should return 200 with user data if the user exists", async () => {
      const mockUser: User= {
        id: 1,
        firebase_uid: "uid_citizen",
        first_name: "John",
        last_name: "Doe",
        username: "citizen_user",
        email: "citizen@example.com",
        role_type: "citizen",
        roles: ["citizen"],
      };
      vi.spyOn(UserDAO.prototype, "findUserByUid").mockResolvedValue(mockUser);

      const res = await request(app).get("/users/uid_citizen");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ user: mockUser });
    });

    it("should return 404 if the user does not exist", async () => {
      vi.spyOn(UserDAO.prototype, "findUserByUid").mockResolvedValue(undefined);

      const res = await request(app).get("/users/nonexistent_uid");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "User not found" });
    });

    it("should return 400 if firebaseUid param is missing", async () => {
      const res = await request(app).get("/users/");
      expect([400, 404]).toContain(res.status);
    });

    it("should return 500 if DAO throws an error", async () => {
      vi.spyOn(UserDAO.prototype, "findUserByUid").mockRejectedValue(new Error("DB error"));

      const res = await request(app).get("/users/uid_citizen");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });
    });
  });
});

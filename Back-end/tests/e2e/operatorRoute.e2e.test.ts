import request from "supertest";
import { Express } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";
import operatorRouter from "../../src/routes/operator.routes.js";
import OperatorDAO from "../../src/dao/OperatorDAO.js";
import * as userService from "../../src/services/userService.js";
import UserDAO from "../../src/dao/UserDAO.js";
import { makeTestApp } from "../setup/tests_util.js";

// Mock Firebase auth middleware
vi.mock("../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (_roles: string[]) => (_req: any, _res: any, next: any) => next(),
}));

describe("Operator Routes E2E", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = makeTestApp(operatorRouter);
  });

  // ----------------------------
  // GET /operators
  // ----------------------------
  describe("GET /operators", () => {
    it("should return a list of operators successfully", async () => {
      const mockOperators = [
        {
          id: 1,
          firebase_uid: "uid1",
          email: "alice@example.com",
          username: "alice",
          first_name: "Alice",
          last_name: "Smith",
          role_name: "Operator",
          role_type: "tech_officer"
        },
      ];

      const getOperatorsSpy = vi
        .spyOn(OperatorDAO.prototype, "getOperators")
        .mockResolvedValue(mockOperators);

      const res = await request(app).get("/operators");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockOperators);
      expect(getOperatorsSpy).toHaveBeenCalledTimes(1);
    });

    it("should return 204 if no operators exist", async () => {
      vi.spyOn(OperatorDAO.prototype, "getOperators").mockResolvedValue([]);

      const res = await request(app).get("/operators");

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it("should return 500 if database error occurs", async () => {
      vi.spyOn(OperatorDAO.prototype, "getOperators").mockRejectedValue(new Error("DB error"));

      const res = await request(app).get("/operators");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "DB error" });
    });
  });

  // ----------------------------
  // POST /operator-registrations
  // ----------------------------
  describe("POST /operator-registrations", () => {
    it("should create a new operator successfully", async () => {
      const mockUser = {
        id: 100,
        firebase_uid: "firebaseUid",
        email: "alice@example.com",
        username: "aliceop",
        first_name: "Alice",
        last_name: "Operator",
        role_name: "Operator",
        role_type: "tech_officer",
      };

      vi.spyOn(userService, "createUserWithFirebase").mockResolvedValue(mockUser);

      const res = await request(app)
        .post("/operator-registrations")
        .send({
          firstName: "Alice",
          lastName: "Operator",
          username: "aliceop",
          email: "alice@example.com",
          password: "password123",
          role_id: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ message: "User created successfully", userId: 100 });
    });

    it("should return 400 for invalid request data", async () => {
      const res = await request(app)
        .post("/operator-registrations")
        .send({
          firstName: "",
          lastName: "Operator",
          email: "not-an-email",
          role_id: "abc",
        });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Invalid request data" });
    });

    it("should return 422 if role_id is invalid (admin or citizen)", async () => {
      const resAdmin = await request(app)
        .post("/operator-registrations")
        .send({
          firstName: "Bob",
          lastName: "Admin",
          username: "bobadmin",
          email: "bob@example.com",
          password: "pass123",
          role_id: 4,
        });

      expect(resAdmin.status).toBe(422);
      expect(resAdmin.body).toEqual({
        error: "Invalid role data, cannot assign admin or citizen",
      });

      const resCitizen = await request(app)
        .post("/operator-registrations")
        .send({
          firstName: "Charlie",
          lastName: "Citizen",
          username: "charlie",
          email: "charlie@example.com",
          password: "pass123",
          role_id: 1,
        });

      expect(resCitizen.status).toBe(422);
      expect(resCitizen.body).toEqual({
        error: "Invalid role data, cannot assign admin or citizen",
      });
    });

    it("should return 422 if EmailOrUsernameConflictError is thrown", async () => {
      vi.spyOn(userService, "createUserWithFirebase").mockRejectedValue(
        new userService.EmailOrUsernameConflictError("Email or username already in use")
      );

      const res = await request(app)
        .post("/operator-registrations")
        .send({
          firstName: "Dana",
          lastName: "Operator",
          username: "danaop",
          email: "dana@example.com",
          password: "password123",
          role_id: 2,
        });

      expect(res.status).toBe(422);
      expect(res.body).toEqual({ error: "Email or username already in use" });
    });

    it("should return 409 if UserAlreadyExistsError is thrown", async () => {
      vi.spyOn(userService, "createUserWithFirebase").mockRejectedValue(
        new userService.UserAlreadyExistsError("User already registered")
      );

      const res = await request(app)
        .post("/operator-registrations")
        .send({
          firstName: "Eve",
          lastName: "Operator",
          username: "eveop",
          email: "eve@example.com",
          password: "password123",
          role_id: 2,
        });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: "User already registered" });
    });

    it("should return 500 for unknown errors", async () => {
      vi.spyOn(userService, "createUserWithFirebase").mockRejectedValue(
        new Error("Unexpected failure")
      );

      const res = await request(app)
        .post("/operator-registrations")
        .send({
          firstName: "Frank",
          lastName: "Operator",
          username: "frankop",
          email: "frank@example.com",
          password: "password123",
          role_id: 2,
        });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });
    });
  });
});

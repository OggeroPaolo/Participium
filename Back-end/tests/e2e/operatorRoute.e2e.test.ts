import request from "supertest";
import { Express } from "express";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import operatorRouter from "../../src/routes/operator.routes.js";
import OperatorDAO from "../../src/dao/OperatorDAO.js";
import * as userService from "../../src/services/userService.js";
import { initTestDB, makeTestApp, resetTestDB } from "../setup/tests_util.js";
import { runQuery } from "../../src/config/database.js";
import { ROLES } from "../../src/models/userRoles.js";
import { assert } from "console";
import RolesDao from "../../src/dao/RolesDAO.js";
// Mock Firebase auth middleware
vi.mock("../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (_roles: string[]) => (_req: any, _res: any, next: any) => next(),
}));

describe("Operator Routes E2E", () => {
  let app: Express;

  beforeAll(async () => {
    await initTestDB();
    app = makeTestApp(operatorRouter);
  });

  afterEach(async () => {
    await resetTestDB();
  });


  // ----------------------------
  // GET /operators
  // ----------------------------
  describe("GET /operators", () => {
    it("should return a list of operators successfully", async () => {

      const res = await request(app).get("/operators");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("should return 204 if no operators exist", async () => {

      // Delete all operators
      await runQuery("PRAGMA foreign_keys = OFF");
      await runQuery("DELETE FROM users");
      await runQuery("PRAGMA foreign_keys = ON");

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
        role_type: ROLES.TECH_OFFICER,
        roles: ["Operator"],
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
      expect(res.body.errors).toHaveLength(7);
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


    it("should return 422 if Firebase auth/email-already-exists error is thrown", async () => {
      vi.spyOn(userService, "createUserWithFirebase").mockRejectedValue({
        code: "auth/email-already-exists",
        message: "Firebase email already exists",
      });

      const res = await request(app)
        .post("/operator-registrations")
        .send({
          firstName: "George",
          lastName: "Operator",
          username: "georgeop",
          email: "george@example.com",
          password: "password123",
          role_id: 2,
        });

      expect(res.status).toBe(422);
      expect(res.body).toEqual({ error: "Firebase email already exists" });
    });
  });

  // ----------------------------
  // PATCH /operators/:operatorId/roles
  // ----------------------------
  describe("PATCH /operators/:operatorId/roles", () => {
    const operatorId = 12; // tech_officer without report assign

    it("should successfully update roles when valid tech_officer roles are provided", async () => {
      const res = await request(app)
        .patch(`/operators/${operatorId}/roles`)
        .send({ roles_id: [3, 4] });
      expect(res.status).toBe(200);
    });

    it("should return 400 if trying to assign roles not of type tech_officer", async () => {
      const res = await request(app)
        .patch(`/operators/${operatorId}/roles`)
        .send({ roles_id: [1, 2] }); //1 = citizen and 2 = admin
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: "Changing roles is not allowed to roles that are not of type tech officer",
      });
    });


    it("should return 400 if operator has reports for roles to be removed", async () => {

      const res = await request(app)
        .patch(`/operators/10/roles`) //tech_officer with some reports assigned
        .send({ roles_id: [3, 4] });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: "This internal officer has reports for some roles",
        conflicting_roles: [{ role_id: 8, role_name: "Road_signs_urban_furnishings_officer" }],
      });
    });

    it("should return 500 if an unexpected error occurs", async () => {

      vi.spyOn(RolesDao.prototype, "getRolesByIds").mockRejectedValue(new Error("DB failure"));

      const res = await request(app)
        .patch(`/operators/${operatorId}/roles`)
        .send({ roles_id:[3] });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });
    });

  });
});

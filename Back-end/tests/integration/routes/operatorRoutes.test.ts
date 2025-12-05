import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeTestApp } from "../../setup/tests_util.js";
import router from "../../../src/routes/operator.routes.js";
import * as userService from "../../../src/services/userService.js";
import OperatorDAO from "../../../src/dao/OperatorDAO.js";
import { ExternalUserDTO } from "../../../src/dto/externalUserDTO.js";

// Mock firebase middleware
vi.mock("../../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (_roles: string[]) => (_req: any, _res: any, next: any) => next(),
}));

let app: any;

beforeEach(() => {
  vi.clearAllMocks();
  app = makeTestApp(router);
});
describe("Operator Routes Unit Test", () => {
  describe("GET /operators", () => {
    it("should return 200 with a list of operators", async () => {
      const mockOperators = [
        {
          id: 1,
          firebase_uid: "uid1",
          email: "operator1@example.com",
          username: "op1",
          first_name: "Alice",
          last_name: "Doe",
          role_name: "Operator",
          role_type: "tech_officer",
        },
        {
          id: 2,
          firebase_uid: "uid2",
          email: "operator2@example.com",
          username: "op2",
          first_name: "Bob",
          last_name: "Smith",
          role_name: "Municipal_public_relations_officer",
          role_type: "pub_relations",
        },
      ];

      const getOperatorsSpy = vi
        .spyOn(OperatorDAO.prototype, "getOperators")
        .mockResolvedValueOnce(mockOperators);

      const res = await request(app).get("/operators");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockOperators);
      expect(getOperatorsSpy).toHaveBeenCalledTimes(1);
    });

    it("should return 204 if no operators exist", async () => {
      vi.spyOn(OperatorDAO.prototype, "getOperators").mockResolvedValueOnce([]);

      const res = await request(app).get("/operators");

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it("should return 500 if DAO throws an error", async () => {
      vi.spyOn(OperatorDAO.prototype, "getOperators").mockRejectedValueOnce(new Error("Database error"));

      const res = await request(app).get("/operators");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Database error" });
    });
  });
  describe("GET /categories/:categoryId/operators", () => {
    it("should return 200 with a list of operators for the category", async () => {
      const mockOperators = [
        {
          id: 1,
          firebase_uid: "uid1",
          email: "operator1@example.com",
          username: "op1",
          first_name: "Alice",
          last_name: "Doe",
          role_name: "Operator",
          role_type: "tech_officer",
        },
        {
          id: 2,
          firebase_uid: "uid2",
          email: "operator2@example.com",
          username: "op2",
          first_name: "Bob",
          last_name: "Smith",
          role_name: "Municipal_public_relations_officer",
          role_type: "pub_relations",
        },
      ];

      const spy = vi
        .spyOn(OperatorDAO.prototype, "getOperatorsByCategory")
        .mockResolvedValueOnce(mockOperators);

      const res = await request(app).get("/categories/10/operators");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockOperators);
      expect(spy).toHaveBeenCalledWith(10);
    });

    it("should return 204 if no operators exist in the category", async () => {
      vi.spyOn(OperatorDAO.prototype, "getOperatorsByCategory")
        .mockResolvedValueOnce([]);

      const res = await request(app).get("/categories/10/operators");

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it("should return 400 if categoryId is not a number", async () => {
      const res = await request(app).get("/categories/abc/operators");
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: "Category ID must be a valid integer",
      });
    });

    it("should return 500 if DAO throws", async () => {
      vi.spyOn(OperatorDAO.prototype, "getOperatorsByCategory")
        .mockRejectedValueOnce(new Error("Database failure"));

      const res = await request(app).get("/categories/5/operators");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Database failure" });
    });
  });

  describe("POST /operator-registrations", () => {
    it("should create a new operator successfully", async () => {
      vi.spyOn(userService, "createUserWithFirebase").mockResolvedValue({
        id: 100,
        firebase_uid: "firebaseUid",
        email: "alice@example.com",
        username: "aliceop",
        first_name: "Alice",
        last_name: "Operator",
        role_name: "Citizen",
        role_type: "citizen",
      });

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
      expect(res.body).toEqual({
        message: "User created successfully",
        userId: 100,
      });
    });

    it("should return 400 if request body is invalid", async () => {
      const res = await request(app)
        .post("/operator-registrations")
        .send({
          firstName: "",
          lastName: 12,
          username: "aliceop",
          email: "alice@example.com",
          password: "password123",
          role_id: "dsadas",
        });

      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveLength(3);
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
      vi.spyOn(userService, "createUserWithFirebase")
        .mockRejectedValue(new userService.EmailOrUsernameConflictError("Email or username already in use"));

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
      vi.spyOn(userService, "createUserWithFirebase")
        .mockRejectedValue(new userService.UserAlreadyExistsError("User already registered"));

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
      vi.spyOn(userService, "createUserWithFirebase")
        .mockRejectedValue(new Error("Unexpected failure"));

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


  describe("GET /external-maintainers", () => {

    it("should return 200 with a list of external maintainers", async () => {
      const mockMaintainers: ExternalUserDTO[] = [
        {
          id: 1,
          fullName: "Alice Doe",
          username: "alice1",
          email: "alice@example.com",
          roleName: "External Maintainer",
          roleType: "external_maintainer",
          companyId: 1,
          companyName: "Company A",
        },
        {
          id: 2,
          fullName: "Bob Smith",
          username: "bob2",
          email: "bob@example.com",
          roleName: "External Maintainer",
          roleType: "external_maintainer",
          companyId: 2,
          companyName: "Company B",
        }
      ];

      const spy = vi.spyOn(OperatorDAO.prototype, "getExternalMaintainersByFilter")
        .mockResolvedValueOnce(mockMaintainers);

      const res = await request(app).get("/external-maintainers");
      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockMaintainers);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({ "categoryId": NaN, "companyId": NaN, });
    });

    it("should apply filters from query params", async () => {
      const mockMaintainers: ExternalUserDTO[] = [
        {
          id: 3,
          fullName: "Charlie Doe",
          username: "charlie",
          email: "charlie@example.com",
          roleName: "External Maintainer",
          roleType: "external_maintainer",
          companyId: 2,
          companyName: "Company B",
        }
      ];

      const spy = vi.spyOn(OperatorDAO.prototype, "getExternalMaintainersByFilter")
        .mockResolvedValueOnce(mockMaintainers);

      const res = await request(app).get("/external-maintainers?companyId=5&categoryId=2");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockMaintainers);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith({ companyId: 5, categoryId: 2 });
    });

    it("should return 204 if no external maintainers exist", async () => {
      vi.spyOn(OperatorDAO.prototype, "getExternalMaintainersByFilter")
        .mockResolvedValueOnce([]);

      const res = await request(app).get("/external-maintainers");

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it("should return 400 for invalid query params", async () => {
      const res = await request(app).get("/external-maintainers?companyId=213dsa&categoryId=abc");

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual([
        "CompanyId must be a positive integer",
        "CategoryId must be a positive integer"
      ]);
    });

    it("should return 500 if DAO throws an error", async () => {
      vi.spyOn(OperatorDAO.prototype, "getExternalMaintainersByFilter")
        .mockRejectedValueOnce(new Error("Database failure"));

      const res = await request(app).get("/external-maintainers");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Database failure" });
    });

  });
});
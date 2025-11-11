import request from "supertest";
import { Express } from "express";
import { describe, it, expect, beforeEach, vi } from "vitest";
import appRouter from "../../src/routes/index.js";
import UserDAO from "../../src/dao/UserDAO.js";
import OperatorDAO from "../../src/dao/OperatorDAO.js";
import RolesDao from "../../src/dao/RolesDAO.js";
import * as userService from "../../src/services/userService.js";
import { makeTestApp } from "../setup/tests_util.js";

// Mock firebase token verification middleware
vi.mock("../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (_roles: string[]) => (_req: any, _res: any, next: any) => next(),
}));

describe("Integrated Routes E2E  (check if all routes are correctly mount)", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = makeTestApp(appRouter);
  });

  // === User registration test ===
  it("POST /user-registrations should create a new user successfully", async () => {
    const mockUser = { id: "u1" } as any;

    const spy = vi
      .spyOn(userService, "createUserWithFirebase")
      .mockResolvedValue(mockUser);

    const res = await request(app).post("/user-registrations").send({
      firstName: "John",
      lastName: "Doe",
      username: "johndoe",
      email: "john@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      message: "User data saved successfully",
      userId: "u1",
    });

    spy.mockRestore();
  });

  // === Operator registration test ===
  it("POST /operator-registrations should create a new operator successfully", async () => {
    const mockOperator = { id: "op1" } as any;

    const spy = vi
      .spyOn(userService, "createUserWithFirebase")
      .mockResolvedValue(mockOperator);

    const res = await request(app).post("/operator-registrations").send({
      firstName: "Alice",
      lastName: "Smith",
      username: "alice123",
      email: "alice@example.com",
      password: "password123",
      role_id: 2, // valid operator role
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      message: "User created successfully",
      userId: "op1",
    });

    spy.mockRestore();
  });

  // === Roles route test ===
  it("GET /roles should return roles list", async () => {
    const mockRoles = [
      { id: 1, name: "Citizen" },
      { id: 2, name: "Operator" },
      { id: 4, name: "Admin" },
    ];

    const spy = vi.spyOn(RolesDao.prototype, "getRoles").mockResolvedValue(mockRoles);

    const res = await request(app).get("/roles");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockRoles);

    spy.mockRestore();
  });

  // === Operators list test ===
  it("GET /operators should return operators list", async () => {
    const mockOperators: any[] = [
  {
    id: 1,
    firebase_uid: "uid1",
    first_name: "Alice",
    last_name: "Smith",
    email: "alice@example.com",
    username: "operator1",
    role_id: 2,
    role_name: "technical_office_operator",
    role_type: "operator",
  },
  {
    id: 2,
    firebase_uid: "uid2",
    first_name: "Bob",
    last_name: "Johnson",
    email: "bob@example.com",
    username: "operator2",
    role_id: 2,
    role_name: "technical_office_operator",
    role_type: "operator",
  },
];


    const spy = vi.spyOn(OperatorDAO.prototype, "getOperators").mockResolvedValue(mockOperators);

    const res = await request(app).get("/operators");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockOperators);

    spy.mockRestore();
  });

  // === Get user by Firebase UID ===
  it("GET /users/:firebaseUid should return a user", async () => {
    const mockUser = {
      id: 4,
      firebase_uid: "uid123",
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
      username: "johndoe",
      role_id: 2,
      role_name: "org_office_operator",
      role_type: "operator",

    };

    const spy = vi.spyOn(UserDAO.prototype, "findUserByUid").mockResolvedValue(mockUser);

    const res = await request(app).get("/users/uid123");

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(mockUser);

    spy.mockRestore();
  });
});

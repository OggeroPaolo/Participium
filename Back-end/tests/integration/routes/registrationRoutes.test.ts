import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeTestApp } from "../../setup/tests_util.js";
import router from "../../../src/routes/registrations.routes.js";
import {
  createUserWithFirebase,
  EmailOrUsernameConflictError,
  UserAlreadyExistsError,
} from "../../../src/services/userService.js";

// Mock userService
vi.mock("../../../src/services/userService.js", () => ({
  createUserWithFirebase: vi.fn(),
  EmailOrUsernameConflictError: class EmailOrUsernameConflictError extends Error {},
  UserAlreadyExistsError: class UserAlreadyExistsError extends Error {},
}));

let app: any;

beforeEach(() => {
  vi.clearAllMocks();
  app = makeTestApp(router);
});

describe("POST /user-registrations", () => {
  it("should register user successfully", async () => {
    (createUserWithFirebase as any).mockResolvedValue({ id: 42 });

    const res = await request(app)
      .post("/user-registrations")
      .send({
        firstName: "John",
        lastName: "Doe",
        username: "john123",
        email: "john@example.com",
        password: "123456",
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      message: "User data saved successfully",
      userId: 42,
    });
  });

  it("should return 400 if body is invalid", async () => {
    const res = await request(app)
      .post("/user-registrations")
      .send({
        firstName: "",
        email: "not-an-email",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid request data");
  });

  it("should return 422 if EmailOrUsernameConflictError is thrown", async () => {
    (createUserWithFirebase as any).mockRejectedValue(
      new EmailOrUsernameConflictError("Email or username already in use")
    );

    const res = await request(app)
      .post("/user-registrations")
      .send({
        firstName: "Jane",
        lastName: "Doe",
        username: "jane123",
        email: "jane@example.com",
        password: "abcdef",
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe("Email or username already in use");
  });

  it("should return 409 if UserAlreadyExistsError is thrown", async () => {
    (createUserWithFirebase as any).mockRejectedValue(
      new UserAlreadyExistsError("User already registered")
    );

    const res = await request(app)
      .post("/user-registrations")
      .send({
        firstName: "Jane",
        lastName: "Doe",
        username: "jane123",
        email: "jane@example.com",
        password: "abcdef",
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("User already registered");
  });

  it("should return 500 for unknown errors", async () => {
    (createUserWithFirebase as any).mockRejectedValue(new Error("Unexpected failure"));

    const res = await request(app)
      .post("/user-registrations")
      .send({
        firstName: "John",
        lastName: "Doe",
        username: "john123",
        email: "john@example.com",
        password: "123456",
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

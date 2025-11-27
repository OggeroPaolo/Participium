import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeTestApp } from "../../setup/tests_util.js";
import router from "../../../src/routes/registrations.routes.js";
import * as userService from "../../../src/services/userService.js";

let app: any;

beforeEach(() => {
  vi.clearAllMocks();
  app = makeTestApp(router);
});

describe("POST /user-registrations", () => {
  it("should register user successfully", async () => {
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
      .post("/user-registrations")
      .send({
        firstName: "Alice",
        lastName: "Operator",
        username: "aliceop",
        email: "alice@example.com",
        password: "password123",
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      message: "User data saved successfully",
      userId: 100,
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
    vi.spyOn(userService, "createUserWithFirebase").mockRejectedValue(
      new userService.EmailOrUsernameConflictError("Email or username already in use")
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
    vi.spyOn(userService, "createUserWithFirebase").mockRejectedValue(
      new userService.UserAlreadyExistsError("User already registered")
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
    vi.spyOn(userService, "createUserWithFirebase").mockRejectedValue(new Error("Unexpected failure"));

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

  it('should return 422 if Firebase auth/email-already-exists error is thrown', async () => {
    vi.spyOn(userService, 'createUserWithFirebase').mockRejectedValue({
      code: 'auth/email-already-exists',
      message: 'Firebase email already exists',
    });

    const res = await request(app)
      .post('/user-registrations')
      .send({
        firstName: 'Sam',
        lastName: 'Smith',
        username: 'samsmith',
        email: 'sam@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Firebase email already exists');
  });

});

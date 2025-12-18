import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";

import { makeTestApp } from "../../setup/tests_util.js";
import router from "../../../src/routes/registrations.routes.js";

import UserDAO from "../../../src/dao/UserDAO.js";
import * as emailService from "../../../src/services/emailService.js";
import * as pendingUsers from "../../../src/services/pendingUsersService.js";
import * as passwordEnc from "../../../src/services/passwordEncryptionSercive.js";
import * as userService from "../../../src/services/userService.js";

let app: any;

beforeEach(() => {
  vi.clearAllMocks();
  app = makeTestApp(router);

  // default mocks used for registration tests
  vi.spyOn(UserDAO.prototype, "findUserByEmailOrUsername")
    .mockResolvedValue(null);

  vi.spyOn(emailService, "sendVerificationEmail")
    .mockResolvedValue();

  vi.spyOn(pendingUsers, "savePendingUser")
    .mockImplementation(() => { });

  vi.spyOn(passwordEnc, "encrypt").mockReturnValue({
    encrypted: "encryptedData",
    iv: "fakeIv",
    tag: "fakeTag",
  });
});


describe("POST /user-registrations", () => {

  it("should send verification code and save pending user", async () => {
    const res = await request(app)
      .post("/user-registrations")
      .send({
        firstName: "Alice",
        lastName: "Operator",
        username: "aliceop",
        email: "alice@example.com",
        password: "password123",
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: "Verification code sent to your email",
    });

    expect(UserDAO.prototype.findUserByEmailOrUsername).toHaveBeenCalled();
    expect(pendingUsers.savePendingUser).toHaveBeenCalled();
    expect(emailService.sendVerificationEmail).toHaveBeenCalled();
  });

  it("should return 400 if body is invalid", async () => {
    const res = await request(app)
      .post("/user-registrations")
      .send({
        firstName: "",
        email: "not-an-email",
      });

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it("should return 422 if email or username is already taken", async () => {
    vi.spyOn(UserDAO.prototype, "findUserByEmailOrUsername")
      .mockResolvedValue({
        id: 100,
        firebase_uid: "firebaseUid",
        username: "aliceop",
        first_name: "Jane",
        last_name: "Doe",
        email: "alice@example.com",
        roles: [{
          role_name: "Citizen",
          role_type: "citizen",
        }]
      });



    const res = await request(app)
      .post("/user-registrations")
      .send({
        firstName: "Alice",
        lastName: "Doe",
        username: "jane123",
        email: "alice@example.com",
        password: "abcdef",
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe("Email or username already in use");
  });

  it("should return 422 if a pending user already exists", async () => {
    vi.spyOn(pendingUsers, "getPendingUser").mockReturnValue({
      hashedCode: "hashed123",
      encryptedPassword: { encrypted: "enc", iv: "iv", tag: "tag" },
      userData: {
        firstName: "Alice",
        lastName: "Operator",
        username: "aliceop",
        email: "alice@example.com",
      },
      expiresAt: Date.now() + 30 * 60 * 1000,
    });

    const res = await request(app)
      .post("/user-registrations")
      .send({
        firstName: "Sam",
        lastName: "Doe",
        username: "sammy",
        email: "sam@example.com",
        password: "password",
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe(
      "A user is already pending for this email, please verify the account using the code sent via email or generate a new one"
    );
  });
  it("should return 400 if password is missing", async () => {
    const res = await request(app)
      .post("/user-registrations")
      .send({
        firstName: "John",
        lastName: "Doe",
        username: "john123",
        email: "john@example.com",
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toContain("Password must be a string");
  });

  it("should return 400 if username contains invalid characters", async () => {
    const res = await request(app)
      .post("/user-registrations")
      .send({
        firstName: "John",
        lastName: "Doe",
        username: "john!!",
        email: "john@example.com",
        password: "123456",
      });

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it("should return 500 on unexpected errors", async () => {
    vi.spyOn(UserDAO.prototype, "findUserByEmailOrUsername")
      .mockRejectedValue(new Error("Unexpected failure"));

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


describe("POST /verify-code", () => {

  beforeEach(() => {
    // pending entry
    vi.spyOn(pendingUsers, "getPendingUser").mockReturnValue({
      hashedCode: "$2b$10$fakehash",
      encryptedPassword: {
        encrypted: "enc",
        iv: "iv",
        tag: "tag",
      },
      userData: {
        firstName: "Alice",
        lastName: "Operator",
        username: "aliceop",
        email: "alice@example.com",
      },
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    vi.spyOn(bcrypt, "compare").mockResolvedValue(true);

    vi.spyOn(passwordEnc, "decrypt").mockReturnValue("password123");

    vi.spyOn(userService, "createUserWithFirebase").mockResolvedValue({
      id: 42,
      firebase_uid: "firebaseUid",
      username: "aliceop",
      first_name: "Jane",
      last_name: "Doe",
      email: "alice@example.com",
      roles: [{
        role_name: "Citizen",
        role_type: "citizen",
      }]
    });

    vi.spyOn(pendingUsers, "removePendingUser").mockImplementation(() => { });
  });

  it("should verify code and create user", async () => {
    const res = await request(app)
      .post("/verify-code")
      .send({
        email: "alice@example.com",
        code: "1234",
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      message: "User verified and registered successfully",
      userId: 42,
    });

    expect(bcrypt.compare).toHaveBeenCalled();
    expect(passwordEnc.decrypt).toHaveBeenCalled();
    expect(userService.createUserWithFirebase).toHaveBeenCalled();
    expect(pendingUsers.removePendingUser).toHaveBeenCalled();
  });

  it("should return 400 when no pending entry exists", async () => {
    vi.spyOn(pendingUsers, "getPendingUser").mockReturnValue(undefined);

    const res = await request(app)
      .post("/verify-code")
      .send({
        email: "missing@example.com",
        code: "1234",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No pending verification for this email");
  });

  it("should return 401 when code is wrong", async () => {
    vi.spyOn(bcrypt, "compare").mockResolvedValue();

    const res = await request(app)
      .post("/verify-code")
      .send({
        email: "alice@example.com",
        code: "9999",
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid verification code");
  });

  it("should return 410 when code expired", async () => {
    vi.spyOn(pendingUsers, "getPendingUser").mockReturnValue({
      hashedCode: "hash",
      encryptedPassword: { encrypted: "", iv: "", tag: "" },
      userData: {
        username: "aliceop",
        firstName: "Jane",
        lastName: "Doe",
        email: "alice@example.com",
      },
      expiresAt: Date.now() - 1000,
    });

    const res = await request(app)
      .post("/verify-code")
      .send({
        email: "alice@example.com",
        code: "1234",
      });

    expect(res.status).toBe(410);
    expect(res.body.error).toBe("Verification code expired");
  });

  it("should return 400 if body is invalid", async () => {
    const res = await request(app)
      .post("/verify-code")
      .send({
        email: "notanemail",
        code: "abc",
      });

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it("should return 422 if createUserWithFirebase throws EmailOrUsernameConflictError", async () => {
    vi.spyOn(userService, "createUserWithFirebase")
      .mockRejectedValue(new userService.EmailOrUsernameConflictError("conflict"));

    const res = await request(app)
      .post("/verify-code")
      .send({
        email: "alice@example.com",
        code: "1234",
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe("conflict");
  });

  it("should return 409 if createUserWithFirebase throws UserAlreadyExistsError", async () => {
    vi.spyOn(userService, "createUserWithFirebase")
      .mockRejectedValue(new userService.UserAlreadyExistsError("user exists"));

    const res = await request(app)
      .post("/verify-code")
      .send({
        email: "alice@example.com",
        code: "1234",
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("user exists");
  });

  it("should return 422 if Firebase throws auth/email-already-exists error", async () => {
    vi.spyOn(userService, "createUserWithFirebase")
      .mockRejectedValue({ code: "auth/email-already-exists", message: "firebase dup" });

    const res = await request(app)
      .post("/verify-code")
      .send({
        email: "alice@example.com",
        code: "1234",
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe("firebase dup");
  });

  it("should return 500 on unexpected internal errors during verification", async () => {
    vi.spyOn(userService, "createUserWithFirebase")
      .mockRejectedValue(new Error("unexpected failure"));

    const res = await request(app)
      .post("/verify-code")
      .send({
        email: "alice@example.com",
        code: "1234",
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });

});

describe("POST /resend-code", () => {

  beforeEach(() => {
    vi.spyOn(pendingUsers, "getPendingUser").mockReturnValue({
      hashedCode: "hash",
      encryptedPassword: { encrypted: "", iv: "", tag: "" },
      userData: {
        username: "aliceop",
        firstName: "Jane",
        lastName: "Doe",
        email: "test@email.com"
      },
      expiresAt: Date.now() + 10000,
    });

    vi.spyOn(pendingUsers, "updateCode").mockImplementation(() => { });
    vi.spyOn(emailService, "resendVerificationEmail").mockResolvedValue();
  });

  it("should resend code successfully", async () => {
    const res = await request(app)
      .post("/resend-code")
      .send({ email: "alice@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Code resent via email");

    expect(pendingUsers.updateCode).toHaveBeenCalled();
    expect(emailService.resendVerificationEmail).toHaveBeenCalled();
  });

  it("should return 400 if no pending entry", async () => {
    vi.spyOn(pendingUsers, "getPendingUser").mockReturnValue(undefined);

    const res = await request(app)
      .post("/resend-code")
      .send({ email: "nope@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No pending verification for this email");
  });

  it("should return 400 if email format invalid", async () => {
    const res = await request(app)
      .post("/resend-code")
      .send({ email: "invalid-email" });

    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it("should return 500 on internal errors", async () => {
    vi.spyOn(emailService, "resendVerificationEmail").mockRejectedValue(new Error());

    const res = await request(app)
      .post("/resend-code")
      .send({ email: "alice@example.com" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

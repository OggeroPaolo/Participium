import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeTestApp } from "../../setup/tests_util.js";
import router from "../../../src/routes/registrations.routes.js";
import UserDAO from "../../../src/dao/UserDAO.js";
import * as emailService from "../../../src/services/emailService.js";
import * as pendingUsers from "../../../src/services/pendingUsersService.js";
import * as passwordEnc from "../../../src/services/passwordEncryptionSercive.js";

let app: any;

beforeEach(() => {
  vi.clearAllMocks();
  app = makeTestApp(router);

  // mock DAO
  vi.spyOn(UserDAO.prototype, "findUserByEmailOrUsername")
    .mockResolvedValue(null);

  // mock email
  vi.spyOn(emailService, "sendVerificationEmail")
    .mockResolvedValue();

  // mock pending user service
  vi.spyOn(pendingUsers, "savePendingUser")
    .mockImplementation(() => { });

  vi.spyOn(passwordEnc, "encrypt").mockReturnValue({
    encrypted: "encryptedData",
    iv: "fakeIv",
    tag: "fakeTag"
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
      encryptedPassword: {
        encrypted: "enc",
        iv: "iv",
        tag: "tag"
      },
      userData: {
        firstName: "Alice",
        lastName: "Operator",
        username: "aliceop",
        email: "alice@example.com"
      },
      expiresAt: Date.now() + 30 * 60 * 1000
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

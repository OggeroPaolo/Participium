import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { verifyFirebaseToken } from "../../../src/middlewares/verifyFirebaseToken.js";
import firebaseAdmin from "../../../src/config/firebaseAdmin.js";
import UserDAO from "../../../src/dao/UserDAO.js";
import type { User } from "../../../src/models/user.js";

// Extend Request locally for testing
interface TestRequest extends Request {
  uid?: string;
  user?: User;
}

// ---------------------------
// Reset mocks before each test
// ---------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------
// Helper functions for mocks
// ---------------------------
const mockRes = () => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};

const mockReq = (authHeader?: string): TestRequest =>
({
  headers: { authorization: authHeader },
  uid: undefined,
  user: undefined,
} as TestRequest);

const next: NextFunction = vi.fn();

// ---------------------------
// Sample mock user
// ---------------------------
const mockUser: User = {
  id: 1,
  firebase_uid: "uid-123",
  email: "john@example.com",
  username: "john",
  first_name: "John",
  last_name: "Doe",
  roles: [{
    role_name: "admin",
    role_type: "admin",
  }]
};

// ---------------------------
// Mock Firebase Admin
// ---------------------------
const mockVerifyIdToken = vi.fn();
vi.spyOn(firebaseAdmin, "auth").mockReturnValue({ verifyIdToken: mockVerifyIdToken } as any);

// ---------------------------
// Tests
// ---------------------------
describe("verifyFirebaseToken middleware", () => {

  it("should attach user and call next if token is valid and role allowed", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "uid-123" });
    vi.spyOn(UserDAO.prototype, "findUserByUid").mockResolvedValue(mockUser);

    const req = mockReq("Bearer valid-token");
    const res = mockRes();

    const middleware = verifyFirebaseToken(["admin"]);
    await middleware(req, res, next);

    expect(req.uid).toBe("uid-123");
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("should return 401 if Authorization header is missing", async () => {
    const req = mockReq();
    const res = mockRes();

    const middleware = verifyFirebaseToken(["admin"]);
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if Authorization header is 'Bearer ' with no token", async () => {
    const req = mockReq("Bearer ");
    const res = mockRes();

    const middleware = verifyFirebaseToken(["admin"]);
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if token is invalid", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("invalid token"));

    const req = mockReq("Bearer invalid-token");
    const res = mockRes();

    const middleware = verifyFirebaseToken(["admin"]);
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 404 if user not found", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "uid-123" });
    vi.spyOn(UserDAO.prototype, "findUserByUid").mockResolvedValue(null);

    const req = mockReq("Bearer valid-token");
    const res = mockRes();

    const middleware = verifyFirebaseToken(["admin"]);
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 if role is not allowed", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "uid-123" });
    const userWithWrongRole = { ...mockUser, roles: [{role_name: "test" ,role_type: "user"}] };
    vi.spyOn(UserDAO.prototype, "findUserByUid").mockResolvedValue(userWithWrongRole);

    const req = mockReq("Bearer valid-token");
    const res = mockRes();

    const middleware = verifyFirebaseToken(["admin"]);
    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden: insufficient permissions" });
    expect(next).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createUserWithFirebase,
  UserAlreadyExistsError,
  EmailOrUsernameConflictError,
} from "../../../src/services/userService.js";
import UserDAO from "../../../src/dao/UserDAO.js";

// Mocking Firebase Admin SDK
vi.mock("../../../src/config/firebaseAdmin.js", () => {
  const mockCreateUser = vi.fn();
  const mockDeleteUser = vi.fn();
  const mockAuth = vi.fn(() => ({
    createUser: mockCreateUser,
    deleteUser: mockDeleteUser,
  }));

  return {
    default: {
      auth: mockAuth,
      __mockAuth: mockAuth,
      __mockCreateUser: mockCreateUser,
      __mockDeleteUser: mockDeleteUser,
    },
  };
});

import firebaseAdmin from "../../../src/config/firebaseAdmin.js";

// Mock DAO
const mockUserDAO = {
  findUserByEmailOrUsername: vi.fn(),
  findUserByUid: vi.fn(),
  createUser: vi.fn(),
} as unknown as UserDAO;

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

describe("createUserWithFirebase", () => {
  it("should create a user successfully", async () => {
    const mockCreateUser = (firebaseAdmin as any).__mockCreateUser;

    mockUserDAO.findUserByEmailOrUsername = vi.fn().mockResolvedValue(null);
    mockUserDAO.findUserByUid = vi.fn().mockResolvedValue(null);
    mockUserDAO.createUser = vi.fn().mockResolvedValue({
      id: 1,
      username: "john",
      email: "john@example.com",
    });

    mockCreateUser.mockResolvedValue({ uid: "firebase-uid-123" });

    const userData = {
      email: "john@example.com",
      password: "123456",
      firstName: "John",
      lastName: "Doe",
      username: "john",
    };

    const newUser = await createUserWithFirebase(userData, mockUserDAO);

    expect(mockCreateUser).toHaveBeenCalledWith({
      email: "john@example.com",
      password: "123456",
      displayName: "John Doe",
    });

    expect(mockUserDAO.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        firebaseUid: "firebase-uid-123",
        email: "john@example.com",
      })
    );

    expect(newUser).toEqual({
      id: 1,
      username: "john",
      email: "john@example.com",
    });
  });

  it("should throw EmailOrUsernameConflictError if email or username already exists", async () => {
    mockUserDAO.findUserByEmailOrUsername = vi.fn().mockResolvedValue({ id: 1 });

    const userData = {
      email: "exists@example.com",
      password: "123456",
      firstName: "John",
      lastName: "Doe",
      username: "john",
    };

    await expect(createUserWithFirebase(userData, mockUserDAO)).rejects.toBeInstanceOf(
      EmailOrUsernameConflictError
    );
  });

  it("should rollback Firebase if DB creation fails", async () => {
    const mockCreateUser = (firebaseAdmin as any).__mockCreateUser;
    const mockDeleteUser = (firebaseAdmin as any).__mockDeleteUser;

    mockUserDAO.findUserByEmailOrUsername = vi.fn().mockResolvedValue(null);
    mockUserDAO.findUserByUid = vi.fn().mockResolvedValue(null);
    mockUserDAO.createUser = vi.fn().mockRejectedValue(new Error("DB error"));

    mockCreateUser.mockResolvedValue({ uid: "firebase-uid-999" });

    const userData = {
      email: "fail@example.com",
      password: "123456",
      firstName: "Fail",
      lastName: "Case",
      username: "failuser",
    };

    await expect(createUserWithFirebase(userData, mockUserDAO)).rejects.toThrow("DB error");
    expect(mockDeleteUser).toHaveBeenCalledWith("firebase-uid-999");
  });

  it("should rollback Firebase and throw if user with same UID exists", async () => {
    const mockCreateUser = (firebaseAdmin as any).__mockCreateUser;
    const mockDeleteUser = (firebaseAdmin as any).__mockDeleteUser;

    mockUserDAO.findUserByEmailOrUsername = vi.fn().mockResolvedValue(null);
    mockUserDAO.findUserByUid = vi.fn().mockResolvedValue({ id: 1 });
    mockUserDAO.createUser = vi.fn();

    mockCreateUser.mockResolvedValue({ uid: "dup-uid-123" });

    const userData = {
      email: "duplicate@example.com",
      password: "123456",
      firstName: "Dup",
      lastName: "User",
      username: "duplicate",
    };

    await expect(createUserWithFirebase(userData, mockUserDAO)).rejects.toBeInstanceOf(
      UserAlreadyExistsError
    );
    expect(mockDeleteUser).toHaveBeenCalledWith("dup-uid-123");
  });
});

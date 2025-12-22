import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createUserWithFirebase,
  UserAlreadyExistsError,
  EmailOrUsernameConflictError,
  mapUserWithRoles,
  mapUsersList,
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
import { ROLES } from "../../../src/models/userRoles.js";

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
describe("User services Integration Tests", () => {
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

  describe("mapUserWithRoles", () => {
    it("should map a row with a role correctly", () => {
      const row = {
        id: 1,
        firebase_uid: "uid1",
        email: "test@example.com",
        username: "testuser",
        first_name: "Test",
        last_name: "User",
        profile_photo_url: null,
        telegram_username: null,
        email_notifications_enabled: 1,
        is_active: 1,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
        last_login_at: null,
        role_name: "Admin",
        role_type: ROLES.ADMIN,
      };

      const user = mapUserWithRoles(row);

      expect(user).toEqual({
        id: 1,
        firebase_uid: "uid1",
        email: "test@example.com",
        username: "testuser",
        first_name: "Test",
        last_name: "User",
        profile_photo_url: null,
        telegram_username: null,
        email_notifications_enabled: 1,
        is_active: 1,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
        last_login_at: null,
        role_type: ROLES.ADMIN,
        roles: ["Admin"]
      });
    });

    it("should return empty roles if role_name is missing", () => {
      const row = {
        id: 2,
        firebase_uid: "uid2",
        email: "norole@example.com",
        username: "noroleuser",
        first_name: "No",
        last_name: "Role",
        profile_photo_url: null,
        telegram_username: null,
        email_notifications_enabled: 1,
        is_active: 1,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
        last_login_at: null,
        role_name: null,
        role_type: null,
      };

      const user = mapUserWithRoles(row);

      expect(user?.roles).toEqual([]);
    });

    it("should return undefined if row is null or undefined", () => {
      expect(mapUserWithRoles(null)).toBeUndefined();
      expect(mapUserWithRoles(undefined)).toBeUndefined();
    });
  });

  describe("mapUsersList", () => {
    it("should map multiple rows and aggregate roles per user", () => {
      const rows = [
        {
          id: 1,
          firebase_uid: "uid1",
          email: "multi@example.com",
          username: "multiuser",
          first_name: "Multi",
          last_name: "User",
          profile_photo_url: null,
          telegram_username: null,
          email_notifications_enabled: 1,
          is_active: 1,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
          last_login_at: null,
          role_name: "Tech 1",
          role_type: ROLES.TECH_OFFICER,
        },
        {
          id: 1,
          firebase_uid: "uid1",
          email: "multi@example.com",
          username: "multiuser",
          first_name: "Multi",
          last_name: "User",
          profile_photo_url: null,
          telegram_username: null,
          email_notifications_enabled: 1,
          is_active: 1,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
          last_login_at: null,
          role_name: "Tech 2",
          role_type: ROLES.TECH_OFFICER, // same type as first row
        },
        {
          id: 2,
          firebase_uid: "uid2",
          email: "single@example.com",
          username: "singleuser",
          first_name: "Single",
          last_name: "User",
          profile_photo_url: null,
          telegram_username: null,
          email_notifications_enabled: 1,
          is_active: 1,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
          last_login_at: null,
          role_name: "Viewer",
          role_type: ROLES.CITIZEN,
        },
      ];

      const users = mapUsersList(rows);

      expect(users).toHaveLength(2);

      const multiUser = users.find(u => u.id === 1);
      expect(multiUser).toBeDefined();
      expect(multiUser?.roles).toHaveLength(2);
      expect(multiUser?.roles).toEqual(
        expect.arrayContaining(["Tech 1" ,"Tech 2"])
      );

      expect(multiUser?.role_type).toBe(ROLES.TECH_OFFICER);
      const singleUser = users.find(u => u.id === 2);
      expect(singleUser).toBeDefined();
      expect(singleUser?.roles).toHaveLength(1);
      expect(singleUser?.roles[0]).toEqual("Viewer");
      expect(singleUser?.role_type).toBe(ROLES.CITIZEN);
    });


    it("should return empty array if input is empty", () => {
      expect(mapUsersList([])).toEqual([]);
    });

    it("should skip null rows", () => {
      const rows = [
        null,
        {
          id: 1,
          firebase_uid: "uid1",
          email: "test@example.com",
          username: "testuser",
          first_name: "Test",
          last_name: "User",
          profile_photo_url: null,
          telegram_username: null,
          email_notifications_enabled: 1,
          is_active: 1,
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-02T00:00:00Z",
          last_login_at: null,
          role_name: "Admin",
          role_type: ROLES.ADMIN,
        },
      ];

      const users = mapUsersList(rows as any);
      expect(users).toHaveLength(1);
      expect(users[0].id).toBe(1);
    });
  });

});

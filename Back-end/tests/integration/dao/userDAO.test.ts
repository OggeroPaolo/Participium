import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import UserDAO from "../../../src/dao/UserDAO.js";
import * as db from "../../../src/config/database.js";

describe("UserDAO Integration Test Suite", () => {
  const dao = new UserDAO();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------
  // findUserByUid
  // ------------------------------
  describe("findUserByUid", () => {
    it("returns user data when found", async () => {
      const mockUser = {
        id: 1,
        firebase_uid: "abc123",
        email: "test@example.com",
        username: "tester",
      };

      vi.spyOn(db, "getOne").mockResolvedValueOnce(mockUser);

      const result = await dao.findUserByUid("abc123");

      expect(result).toEqual(mockUser);
      expect(db.getOne).toHaveBeenCalledTimes(1);
      expect(db.getOne).toHaveBeenCalledWith(
        expect.stringContaining("FROM users u, roles r"),
        ["abc123"]
      );
    });

    it("returns null if user not found", async () => {
      vi.spyOn(db, "getOne").mockResolvedValueOnce(undefined);

      const result = await dao.findUserByUid("unknown_uid");

      expect(result).toBeNull();
    });

    it("throws an error if database query fails", async () => {
      vi.spyOn(db, "getOne").mockRejectedValueOnce(new Error("DB Error"));

      await expect(dao.findUserByUid("abc123")).rejects.toThrow("DB Error");
    });
  });

  // ------------------------------
  // findUserByEmailOrUsername
  // ------------------------------
  describe("findUserByEmailOrUsername", () => {
    it("returns user if email or username matches", async () => {
      const mockUser = { id: 2, email: "mario@example.com", username: "mario" };
      vi.spyOn(db, "getOne").mockResolvedValueOnce(mockUser);

      const result = await dao.findUserByEmailOrUsername("mario@example.com", "mario");

      expect(result).toEqual(mockUser);
      expect(db.getOne).toHaveBeenCalledWith(
        expect.stringContaining("(u.email = ? OR u.username = ?)"),
        ["mario@example.com", "mario"]
      );
    });

    it("returns null if no matching user", async () => {
      vi.spyOn(db, "getOne").mockResolvedValueOnce(undefined);

      const result = await dao.findUserByEmailOrUsername("notfound@example.com", "none");

      expect(result).toBeNull();
    });

    it("throws if database query fails", async () => {
      vi.spyOn(db, "getOne").mockRejectedValueOnce(new Error("DB Error"));

      await expect(
        dao.findUserByEmailOrUsername("err@example.com", "erruser")
      ).rejects.toThrow("DB Error");
    });
  });

  // ------------------------------
  // createUser
  // ------------------------------
  describe("createUser", () => {
    const userData = {
      firebaseUid: "XPbEc2V01QhOQm6YRNlYNo57aQl1",
      firstName: "Mario",
      lastName: "Rossi",
      username: "SuperMario",
      email: "mario.rossi@gmail.com",
    };

    it("creates user successfully", async () => {
      vi.spyOn(db, "runQuery").mockResolvedValue(undefined);
      vi.spyOn(dao, "findUserByUid").mockResolvedValueOnce({
        id: 1,
        firebase_uid: userData.firebaseUid,
        email: userData.email,
        username: userData.username,
        first_name: userData.firstName,
        last_name: userData.lastName,
        role_name: "citizen",
      });

      const result = await dao.createUser(userData);

      expect(result).toEqual(
        expect.objectContaining({
          firebase_uid: userData.firebaseUid,
          email: userData.email,
          username: userData.username,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role_name: "citizen",
        })
      );

      expect(db.runQuery).toHaveBeenCalledTimes(1);
      expect(dao.findUserByUid).toHaveBeenCalledWith(userData.firebaseUid);
    });

    it("creates user with a specific role", async () => {
      const userWithRole = {
        firebaseUid: "adminRole123",
        firstName: "Peach",
        lastName: "Toadstool",
        username: "PrincessPeach",
        email: "peach@castle.com",
        role_id: 2,
      };

      vi.spyOn(db, "runQuery").mockResolvedValue(undefined);
      vi.spyOn(dao, "findUserByUid").mockResolvedValueOnce({
        id: 2,
        firebase_uid: userWithRole.firebaseUid,
        email: userWithRole.email,
        username: userWithRole.username,
        first_name: userWithRole.firstName,
        last_name: userWithRole.lastName,
        role_name: "admin",
      });

      const result = await dao.createUser(userWithRole);

      expect(result).toEqual(
        expect.objectContaining({
          id: 2,
          firebase_uid: userWithRole.firebaseUid,
          email: userWithRole.email,
          username: userWithRole.username,
          first_name: userWithRole.firstName,
          last_name: userWithRole.lastName,
          role_name: "admin",
        })
      );

      expect(db.runQuery).toHaveBeenCalledTimes(1);
      //Check to see if the specified role_id was used
      expect(db.runQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        [
          userWithRole.firebaseUid,
          userWithRole.firstName,
          userWithRole.lastName,
          userWithRole.username,
          userWithRole.email,
          2, // provided role_id
        ]
      );

      expect(dao.findUserByUid).toHaveBeenCalledWith(userWithRole.firebaseUid);
    });
    it("throws error if the user creation fail", async () => {
      vi.spyOn(db, "runQuery").mockRejectedValueOnce(new Error("DB Error"));

      await expect(dao.createUser(userData)).rejects.toThrow("DB Error");
    });

    it("throws error if newly created user cannot be retrieved", async () => {
      vi.spyOn(db, "runQuery").mockResolvedValue(undefined);
      vi.spyOn(dao, "findUserByUid").mockResolvedValueOnce(null);

      await expect(dao.createUser(userData)).rejects.toThrow(
        "Failed to retrieve the created user"
      );
    });

  });
});

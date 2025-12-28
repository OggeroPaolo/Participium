import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import UserDAO from "../../../src/dao/UserDAO.js";
import * as db from "../../../src/config/database.js";
import { mapUserWithRoles } from "../../../src/services/userService.js";
import { ROLES } from "../../../src/models/userRoles.js";

const mockUser = {
  firebase_uid: "firebase_uid",
  email: "citizen@example.com",
  username: "JohnDoe",
  first_name: "John",
  last_name: "Doe",
  roles: [{
    role_name: "role",
    role_type: "test"
  }]
};

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


      vi.spyOn(db, "getOne").mockResolvedValueOnce(mockUser);

      const result = await dao.findUserByUid("firebase_uid");

      expect(result).toEqual(mapUserWithRoles(mockUser));
      expect(db.getOne).toHaveBeenCalledTimes(1);
      expect(db.getOne).toHaveBeenCalledWith(
        expect.stringContaining("FROM users u"),
        ["firebase_uid"]
      );
    });

    it("returns null if user not found", async () => {
      vi.spyOn(db, "getOne").mockResolvedValueOnce(undefined);

      const result = await dao.findUserByUid("unknown_uid");

      expect(result).toBeUndefined();
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
      vi.spyOn(db, "getOne").mockResolvedValueOnce(mockUser);

      const result = await dao.findUserByEmailOrUsername(mockUser.email, mockUser.username);

      expect(result).toEqual(mapUserWithRoles(mockUser));
      expect(db.getOne).toHaveBeenCalledWith(
        expect.stringContaining("u.email = ? OR u.username = ?"),
        [mockUser.email, mockUser.username]
      );
    });

    it("returns null if no matching user", async () => {
      vi.spyOn(db, "getOne").mockResolvedValueOnce(undefined);

      const result = await dao.findUserByEmailOrUsername("notfound@example.com", "none");

      expect(result).toBeUndefined();
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

    it("creates user successfully with default role", async () => {
      vi.spyOn(db, "runQuery").mockResolvedValue(undefined);
      vi.spyOn(dao, "findUserByUid").mockResolvedValueOnce({
        id: 1,
        firebase_uid: userData.firebaseUid,
        email: userData.email,
        username: userData.username,
        first_name: userData.firstName,
        last_name: userData.lastName,
        role_type: ROLES.CITIZEN,
        roles: ["Citizen"]
      });

      const result = await dao.createUser(userData);

      expect(result).toEqual(
        expect.objectContaining({
          firebase_uid: userData.firebaseUid,
          email: userData.email,
          username: userData.username,
          first_name: userData.firstName,
          last_name: userData.lastName,
          role_type: ROLES.CITIZEN,
          roles: ["Citizen"]
        })
      );

      // runQuery called twice: insert user + insert role
      expect(db.runQuery).toHaveBeenCalledTimes(2);
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
        role_type: ROLES.ADMIN,
        roles: ["Admin"]
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
          role_type: ROLES.ADMIN,
          roles: ["Admin"]
        })
      );

      // runQuery called twice: insert user + insert role
      expect(db.runQuery).toHaveBeenCalledTimes(2);

      // check user insert query
      expect(db.runQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        [
          userWithRole.firebaseUid,
          userWithRole.firstName,
          userWithRole.lastName,
          userWithRole.username,
          userWithRole.email,
        ]
      );

      // check role insert query
      expect(db.runQuery).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO user_roles"),
        [2, 2] // user_id = 2, role_id = 2
      );

      expect(dao.findUserByUid).toHaveBeenCalledWith(userWithRole.firebaseUid);
    });

    it("throws error if the user creation fails", async () => {
      vi.spyOn(db, "runQuery").mockRejectedValueOnce(new Error("DB Error"));

      await expect(dao.createUser(userData)).rejects.toThrow("DB Error");
    });

    it("throws error if newly created user cannot be retrieved", async () => {
      vi.spyOn(db, "runQuery").mockResolvedValue(undefined);
      vi.spyOn(dao, "findUserByUid").mockResolvedValueOnce(undefined);

      await expect(dao.createUser(userData)).rejects.toThrow(
        "Failed to retrieve created user"
      );
    });
  });



});

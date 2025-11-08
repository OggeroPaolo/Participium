import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import UserDAO from "../../src/dao/UserDAO.js";
import * as db from "../../src/config/database.js";

describe("UserRegistrationDAO Integration Test Suite", () => {
  const dao = new UserDAO();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------
  // POST /user-registrations
  // ------------------------------
  describe("registerUser", () => {
    it("creates a new user successfully (201 Created)", async () => {
      const newUser = {
        firebaseUid: "XPbEc2V01QhOQm6YRNlYNo57aQl1",
        firstName: "Mario",
        lastName: "Rossi",
        username: "SuperMario",
        email: "mario.rossi@gmail.com",
      };

      vi.spyOn(db, "getOne")
        .mockResolvedValueOnce(null) // user not already registered
        .mockResolvedValueOnce(null); // no duplicate email/username

      vi.spyOn(db, "runQuery").mockResolvedValue(undefined);

      const result = await dao.registerUser(newUser);

      expect(result).toEqual({
        message: "User data saved successfully",
        userId: newUser.firebaseUid,
      });

      expect(db.getOne).toHaveBeenCalledTimes(2);
      expect(db.runQuery).toHaveBeenCalledTimes(1);
    });

    it("throws 400 if required fields are missing", async () => {
      const invalidUser = {
        firebaseUid: "",
        firstName: "",
        lastName: "Rossi",
        username: "",
        email: "",
      };

      await expect(dao.registerUser(invalidUser)).rejects.toThrow(
        "Invalid request data"
      );
    });

    it("throws 409 if user already registered", async () => {
      vi.spyOn(db, "getOne").mockResolvedValueOnce({ id: 1 }); // existing user with firebaseUid

      const user = {
        firebaseUid: "XPbEc2V01QhOQm6YRNlYNo57aQl1",
        firstName: "Mario",
        lastName: "Rossi",
        username: "SuperMario",
        email: "mario.rossi@gmail.com",
      };

      await expect(dao.registerUser(user)).rejects.toThrow("User already registered");
    });

    it("throws 422 if email or username already in use", async () => {
      vi.spyOn(db, "getOne")
        .mockResolvedValueOnce(null) // user not registered yet
        .mockResolvedValueOnce({ id: 2 }); // duplicate email/username found

      const user = {
        firebaseUid: "XPbEc2V01QhOQm6YRNlYNo57aQl1",
        firstName: "Mario",
        lastName: "Rossi",
        username: "SuperMario",
        email: "mario.rossi@gmail.com",
      };

      await expect(dao.registerUser(user)).rejects.toThrow(
        "Email or username already in use"
      );
    });

    it("throws 500 on database error", async () => {
      vi.spyOn(db, "getOne").mockRejectedValue(new Error("DB Error"));

      const user = {
        firebaseUid: "XPbEc2V01QhOQm6YRNlYNo57aQl1",
        firstName: "Mario",
        lastName: "Rossi",
        username: "SuperMario",
        email: "mario.rossi@gmail.com",
      };

      await expect(dao.registerUser(user)).rejects.toThrow("Internal server error");
    });
  });
});

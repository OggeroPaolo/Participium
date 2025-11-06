import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import UserDAO from "../../src/dao/UserDAO.js";
import * as db from "../../src/config/database.js";

/* 
  Sign up (Create User): 
    - 200 OK: Create user 
    - 400 Bad Request: Missing fields 
    - 409 Conflict: Email/username already exists 
    - 500 Internal Server Error: Database error 

  Sign In (Authenticate User): 
    - 200 OK: Successful authentication
    - 400 Bad Request: Missing fields 
    - 401 Unauthorized: Invalid credentials 
    - 500 Internal Server Error: Database error 
    - User already sign in (TBD) 
*/

// Generic Test — waiting for actual DAO implementation to test DB queries
// For password comparison, assuming bcrypt is used
describe("UserDAO Integration Test Suite", () => {
  const dao = new UserDAO();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------
  // Sign Up (Create User)
  // ---------------------------------
  describe("signUp", () => {
    it("creates a new user successfully (200 OK)", async () => {
      vi.spyOn(db, "getOne")
        .mockResolvedValueOnce(null) // no existing email or user name

      vi.spyOn(db, "runQuery").mockResolvedValue(undefined);
      vi.spyOn(db, "getOne").mockResolvedValueOnce({
        id: 1,
        email: "test@example.com",
        username: "testuser",
      }); // after insert, return new user

      const result = await dao.signUp("test@example.com", "testuser", "hashedpassword");

      expect(result).toEqual({
        id: 1,
        email: "test@example.com",
        username: "testuser",
      });

      expect(db.getOne).toHaveBeenCalledTimes(2);
      expect(db.runQuery).toHaveBeenCalledTimes(1);
    });


    describe("throws 400 if required fields are missing", () => {
      it("throws 400 if email is missing", async () => {
        await expect(dao.signUp("", "user1", "pass")).rejects.toThrow("Missing required fields");
      });

      it("throws 400 if username is missing", async () => {
        await expect(dao.signUp("test@example.com", "", "pass")).rejects.toThrow("Missing required fields");
      });

      it("throws 400 if password is missing", async () => {
        await expect(dao.signUp("test@example.com", "user1", "")).rejects.toThrow("Missing required fields");
      });

      it("throws 400 if all fields are missing", async () => {
        await expect(dao.signUp("", "", "")).rejects.toThrow("Missing required fields");
      });
    });

    it("throws 409 if email already exists", async () => {
      vi.spyOn(db, "getOne").mockResolvedValueOnce({ id: 1 }); // email already taken

      await expect(dao.signUp("duplicate@example.com", "user1", "pass")).rejects.toThrow(
        "Email or username already exists"
      );
    });

    it("throws 409 if username already exists", async () => {
      vi.spyOn(db, "getOne")
        .mockResolvedValueOnce(null) // email ok
        .mockResolvedValueOnce({ id: 2 }); // username exists

      await expect(dao.signUp("unique@example.com", "takenuser", "pass")).rejects.toThrow(
        "Email or username already exists"
      );
    });

    it("throws 500 on database error", async () => {
      vi.spyOn(db, "getOne").mockRejectedValue(new Error("DB Error"));

      await expect(dao.signUp("test@example.com", "user", "pass")).rejects.toThrow(
        "Database error"
      );
    });
  });

  // ---------------------------------
  // Sign In (Authenticate User)
  // ---------------------------------
  describe("signIn", () => {
    it("authenticates user successfully (200 OK)", async () => {
      vi.spyOn(db, "getOne").mockResolvedValueOnce({
        id: 1,
        email: "test@example.com",
        username: "testuser",
        password: "hashedpassword",
      });

      vi.mock("bcrypt", () => ({
        compare: vi.fn().mockResolvedValue(true),
      }));

      const result = await dao.signIn("test@example.com", "password123");
      expect(result).toEqual({
        id: 1,
        email: "test@example.com",
        username: "testuser",
      });

      expect(db.getOne).toHaveBeenCalledTimes(1);
    });

    describe("throws 400 if required fields are missing", () => {
      it("throws 400 if email is missing", async () => {
        await expect(dao.signIn("", "password")).rejects.toThrow("Missing required fields");
      });

      it("throws 400 if password is missing", async () => {
        await expect(dao.signIn("test@example.com", "")).rejects.toThrow("Missing required fields");
      });

      it("throws 400 if both fields are missing", async () => {
        await expect(dao.signIn("", "")).rejects.toThrow("Missing required fields");
      });
    });

    it("throws 401 if invalid credentials", async () => {
      vi.spyOn(db, "getOne").mockResolvedValueOnce(null);

      await expect(dao.signIn("notfound@example.com", "wrong")).rejects.toThrow(
        "Invalid credentials"
      );
    });

    it("throws 401 if password does not match", async () => {
      vi.spyOn(db, "getOne").mockResolvedValueOnce({
        id: 1,
        email: "test@example.com",
        username: "testuser",
        password: "hashedpassword",
      });

      vi.mock("bcrypt", () => ({
        compare: vi.fn().mockResolvedValue(false),
      }));

      await expect(dao.signIn("test@example.com", "wrongpass")).rejects.toThrow(
        "Invalid credentials"
      );
    });

    it("throws 500 on database error", async () => {
      vi.spyOn(db, "getOne").mockRejectedValue(new Error("DB Error"));

      await expect(dao.signIn("test@example.com", "password")).rejects.toThrow(
        "Database error"
      );
    });

    it.todo("throws error if user already signed in (TBD)");
  });
});

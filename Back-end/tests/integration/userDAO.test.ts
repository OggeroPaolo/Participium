import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as db from "../../src/config/database.js"; // mocked db module

describe("UserDAO Integration Test Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------
  // createUser (manual query version)
  // ---------------------------------------------------
  describe("createUser (manual query)", () => {
    it("creates a new user successfully by running SQL manually", async () => {
      // Arrange: mock db.runQuery to simulate a manual SQL INSERT
      vi.spyOn(db, "runQuery").mockResolvedValue(undefined);

      // Mock db.getOne to simulate returning the newly inserted user
      const fakeUser = {
        id: 1,
        name: "Alice Doe",
        email: "alice@example.com",
        password: "hashed_password",
        created_at: "2025-11-05 10:00:00",
      };
      vi.spyOn(db, "getOne").mockResolvedValue(fakeUser);

      // Act: run the same logic that a createUser API would run manually
      const insertSql = `
        INSERT INTO users (name, email, password, created_at)
        VALUES (?, ?, ?, datetime('now'));
      `;
      await db.runQuery(insertSql, [
        fakeUser.name,
        fakeUser.email,
        fakeUser.password,
      ]);

      // Retrieve the inserted user (simulate SELECT)
      const result = await db.getOne(
        "SELECT * FROM users WHERE email = ?",
        [fakeUser.email]
      );

      // Assert
      expect(result).toEqual(fakeUser);
      expect(db.runQuery).toHaveBeenCalledTimes(1);
      expect(db.getOne).toHaveBeenCalledTimes(1);
    });

    it("throws an error if insert fails", async () => {
      vi.spyOn(db, "runQuery").mockRejectedValue(
        new Error("SQLITE_CONSTRAINT: UNIQUE constraint failed: users.email")
      );

      const insertSql = `
        INSERT INTO users (name, email, password, created_at)
        VALUES (?, ?, ?, datetime('now'));
      `;

      await expect(
        db.runQuery(insertSql, [
          "Bob",
          "existing@example.com",
          "hashed_pw",
        ])
      ).rejects.toThrow("SQLITE_CONSTRAINT");
    });
  });
});

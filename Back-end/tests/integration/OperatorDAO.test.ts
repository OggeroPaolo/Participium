import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import OperatorDAO from "../../src/dao/OperatorDAO.js";
import * as db from "../../src/config/database.js";

describe("OperatorDAO Integration Test Suite", () => {
  const dao = new OperatorDAO();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------
  // GET /operators
  // ------------------------------
  describe("getOperators", () => {
    it("returns a list of operators successfully (200 OK)", async () => {
      const mockOperators = [
        {
          id: 1,
          email: "admin@example.com",
          username: "adminUser",
          first_name: "John",
          last_name: "Doe",
          profile_photo_url: "https://example.com/photos/john_doe.jpg",
          role_name: "Admin",
          created_at: "2025-11-06T10:15:32",
        },
        {
          id: 2,
          email: "operator@example.com",
          username: "operatorUser",
          first_name: "Jane",
          last_name: "Smith",
          profile_photo_url: "https://example.com/photos/jane_smith.jpg",
          role_name: "Operator",
          created_at: "2025-10-30T09:12:45",
        },
      ];

      vi.spyOn(db, "getAll").mockResolvedValue(mockOperators);

      const token = "valid_admin_token";
      const result = await dao.getOperators(token, "admin");

      expect(result).toEqual(mockOperators);
      expect(db.getAll).toHaveBeenCalledTimes(1);
    });

    it("returns 204 No Content when no operators found", async () => {
      vi.spyOn(db, "getAll").mockResolvedValue([]);

      const token = "valid_admin_token";
      await expect(dao.getOperators(token, "admin")).rejects.toThrow("No Content");
    });

    it("throws 401 Unauthorized when token is missing, invalid, or not admin", async () => {
      // Missing token
      await expect(dao.getOperators(null, "admin")).rejects.toThrow(
        "Unauthorized: missing or invalid token"
      );

      // Empty token
      await expect(dao.getOperators("", "admin")).rejects.toThrow(
        "Unauthorized: missing or invalid token"
      );

      // Not an admin
      const token = "valid_user_token";
      await expect(dao.getOperators(token, "operator")).rejects.toThrow(
        "Unauthorized: missing or invalid token"
      );
    });

    it("throws 500 when database connection fails", async () => {
      vi.spyOn(db, "getAll").mockRejectedValue(new Error("Database connection failed"));

      const token = "valid_admin_token";
      await expect(dao.getOperators(token, "admin")).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("throws 500 when query fails unexpectedly", async () => {
      vi.spyOn(db, "getAll").mockRejectedValue(new Error("Failed to retrieve operators"));

      const token = "valid_admin_token";
      await expect(dao.getOperators(token, "admin")).rejects.toThrow(
        "Failed to retrieve operators"
      );
    });
  });
});

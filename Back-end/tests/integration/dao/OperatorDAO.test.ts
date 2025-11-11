import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import OperatorDAO from "../../../src/dao/OperatorDAO.js";
import * as db from "../../../src/config/database.js";

describe("OperatorDAO Integration Test Suite", () => {
  let dao: OperatorDAO;

  beforeEach(() => {
    dao = new OperatorDAO();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getOperators", () => {
    it("returns a list of operators successfully", async () => {
      const mockOperators = [
        {
          id: 1,
          email: "operator1@example.com",
          username: "op1",
          first_name: "Alice",
          last_name: "Doe",
          profile_photo_url: "https://example.com/photos/alice.jpg",
          role_name: "Operator",
          created_at: "2025-11-06T10:15:32",
        },
        {
          id: 2,
          email: "operator2@example.com",
          username: "op2",
          first_name: "Bob",
          last_name: "Smith",
          profile_photo_url: "https://example.com/photos/bob.jpg",
          role_name: "Operator",
          created_at: "2025-10-30T09:12:45",
        },
      ];

      const getAllSpy = vi
        .spyOn(db, "getAll")
        .mockResolvedValueOnce(mockOperators);

      const result = await dao.getOperators();

      expect(result).toEqual(mockOperators);
      expect(getAllSpy).toHaveBeenCalledTimes(1);
      expect(getAllSpy).toHaveBeenCalledWith(expect.stringContaining("SELECT"));
    });

    it("returns an empty array when no operators are found", async () => {
      vi.spyOn(db, "getAll").mockResolvedValueOnce([]);

      const result = await dao.getOperators();
      expect(result).toEqual([]);
    });

    it("throws an error when database connection fails", async () => {
      vi.spyOn(db, "getAll").mockRejectedValueOnce(
        new Error("Database connection failed")
      );

      await expect(dao.getOperators()).rejects.toThrow("Database connection failed");
    });

    it("throws an error when query fails unexpectedly", async () => {
      vi.spyOn(db, "getAll").mockRejectedValueOnce(
        new Error("Failed to retrieve operators")
      );

      await expect(dao.getOperators()).rejects.toThrow("Failed to retrieve operators");
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import OperatorDAO from "../../../src/dao/OperatorDAO.js";
import * as db from "../../../src/config/database.js";
import { ExternalUserDTO } from "../../../src/dto/externalUserDTO.js";

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

  // -------------------------
  // New unit tests for getAssigneeId
  // -------------------------
  describe("getAssigneeId", () => {
    it("returns the user id of the assignee with the fewest assigned reports", async () => {
      const mockAssignees = [
        { id: 5, assigned_report_count: 2 },
      ];

      vi.spyOn(db, "getAll").mockResolvedValueOnce(mockAssignees);

      const result = await dao.getAssigneeId(1); // categoryId = 1
      expect(result).toBe(5);

      expect(db.getAll).toHaveBeenCalledTimes(1);
      expect(db.getAll).toHaveBeenCalledWith(expect.stringContaining("SELECT"), [1]);
    });

    it("throws an error if no assignee is found", async () => {
      vi.spyOn(db, "getAll").mockResolvedValueOnce([]);

      await expect(dao.getAssigneeId(1)).rejects.toThrow("No assignee found");
    });

    it("propagates database errors", async () => {
      vi.spyOn(db, "getAll").mockRejectedValueOnce(new Error("Database error"));

      await expect(dao.getAssigneeId(1)).rejects.toThrow("Database error");
    });
  });

  // -------------------------
  // Tests for getCategoryOfOfficer
  // -------------------------
  describe("getCategoryOfOfficer", () => {
    it("returns the category id of the officer", async () => {
      const mockResult = { category_id: 3 };

      vi.spyOn(db, "getOne").mockResolvedValueOnce(mockResult);

      const result = await dao.getCategoryOfOfficer(10); // officerId = 10

      expect(result).toBe(3);
      expect(db.getOne).toHaveBeenCalledTimes(1);
      expect(db.getOne).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        [10]
      );
    });

    it("returns undefined if no officer category is found", async () => {
      vi.spyOn(db, "getOne").mockResolvedValueOnce(undefined);

      const result = await dao.getCategoryOfOfficer(10);

      expect(result).toBeUndefined();
    });

    it("propagates database errors", async () => {
      vi.spyOn(db, "getOne").mockRejectedValueOnce(
        new Error("DB failure")
      );

      await expect(dao.getCategoryOfOfficer(10)).rejects.toThrow("DB failure");
    });
  });

  // -------------------------
  // Tests for getOperatorsByCategory
  // -------------------------
  describe("getOperatorsByCategory", () => {
    it("returns a list of operators in the given category", async () => {
      const mockOperators = [
        {
          id: 7,
          email: "tech1@example.com",
          username: "tech1",
          first_name: "Jane",
          last_name: "Roe",
          role_name: "Tech Officer",
        },
        {
          id: 8,
          email: "pubrel1@example.com",
          username: "pr1",
          first_name: "John",
          last_name: "Public",
          role_name: "Public Relations",
        },
      ];

      vi.spyOn(db, "getAll").mockResolvedValueOnce(mockOperators);

      const result = await dao.getOperatorsByCategory(2);

      expect(result).toEqual(mockOperators);
      expect(db.getAll).toHaveBeenCalledTimes(1);
      expect(db.getAll).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        [2]
      );
    });

    it("returns an empty array when no operators are found", async () => {
      vi.spyOn(db, "getAll").mockResolvedValueOnce([]);

      const result = await dao.getOperatorsByCategory(2);

      expect(result).toEqual([]);
    });

    it("propagates database errors", async () => {
      vi.spyOn(db, "getAll").mockRejectedValueOnce(
        new Error("Database crash")
      );

      await expect(dao.getOperatorsByCategory(2)).rejects.toThrow(
        "Database crash"
      );
    });
  });

  // -------------------------
  // Tests for getExternalMaintainers
  // -------------------------
  describe("getExternalMaintainersByFilter", () => {
    it("returns a list of external maintainers without filters", async () => {
      const mockOperators = [
        {
          id: 7,
          email: "tech1@example.com",
          username: "tech1",
          first_name: "Jane",
          last_name: "Roe",
          role_name: "Tech Officer",
          role_type: "external_maintainer",
          company_id: 1,
          company_name: "Company A",
          category_id: 2,
        },
        {
          id: 8,
          email: "pubrel1@example.com",
          username: "pr1",
          first_name: "John",
          last_name: "Public",
          role_name: "Public Relations",
          role_type: "external_maintainer",
          company_id: 2,
          company_name: "Company B",
          category_id: 3,
        },
      ];

      const mockResOperators: ExternalUserDTO[] = [
        {
          id: 7,
          fullName: 'Jane Roe',
          username: 'tech1',
          email: 'tech1@example.com',
          roleName: 'Tech Officer',
          roleType: 'external_maintainer',
          companyId: 1,
          companyName: 'Company A',
        },
        {
          id: 8,
          fullName: 'John Public',
          username: 'pr1',
          email: 'pubrel1@example.com',
          roleName: 'Public Relations',
          roleType: 'external_maintainer',
          companyId: 2,
          companyName: 'Company B',
        }
      ];

      vi.spyOn(db, "getAll").mockResolvedValueOnce(mockOperators);

      const result = await dao.getExternalMaintainersByFilter();
      expect(result).toEqual(mockResOperators);
      expect(db.getAll).toHaveBeenCalledTimes(1);
      expect(db.getAll).toHaveBeenCalledWith(
        expect.stringContaining("r.type = 'external_maintainer'"),
        []
      );
    });

    it("applies filters correctly", async () => {
      const mockOperators = [
        {
          id: 9,
          email: "external@example.com",
          username: "ext1",
          first_name: "External",
          last_name: "User",
          role_name: "External Maintainer",
          role_type: "external_maintainer",
          company_id: 5,
          company_name: "Company B",
          category_id: 2,
        },
      ];

      const mockRes: ExternalUserDTO[] = [
        {
          id: 9,
          fullName: "External User",
          username: "ext1",
          email: "external@example.com",
          roleName: "External Maintainer",
          roleType: "external_maintainer",
          companyId: 5,
          companyName: "Company B",
        },
      ];

      const filters = { companyId: 5, categoryId: 2 };
      vi.spyOn(db, "getAll").mockResolvedValueOnce(mockOperators);

      const result = await dao.getExternalMaintainersByFilter(filters);

      expect(result).toEqual(mockRes);
      expect(db.getAll).toHaveBeenCalledTimes(1);
      // Ensure the query has WHERE conditions for the filters
      expect(db.getAll).toHaveBeenCalledWith(
        expect.stringContaining("r.type = 'external_maintainer' AND c.id = ? AND c.category_id = ?"),
        [5, 2]
      );
    });

    it("returns an empty array when no external maintainers are found", async () => {
      vi.spyOn(db, "getAll").mockResolvedValueOnce([]);

      const result = await dao.getExternalMaintainersByFilter();

      expect(result).toEqual([]);
      expect(db.getAll).toHaveBeenCalledTimes(1);
    });

    it("propagates database errors", async () => {
      vi.spyOn(db, "getAll").mockRejectedValueOnce(new Error("Database crash"));

      await expect(dao.getExternalMaintainersByFilter()).rejects.toThrow("Database crash");
    });
  });
});

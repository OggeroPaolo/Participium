import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import OperatorDAO from "../../../src/dao/OperatorDAO.js";
import * as db from "../../../src/config/database.js";
import { ExternalUserDTO } from "../../../src/dto/externalUserDTO.js";
import { User } from "../../../src/models/user.js";
import { mapUsersList } from "../../../src/services/userService.js";


describe("OperatorDAO Integration Test Suite", () => {
  let dao: OperatorDAO;

  beforeEach(async () => {
    dao = new OperatorDAO();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getOperators", () => {
    it("returns a list of operators successfully", async () => {
      const mockRows = [
        {
          id: 1,
          firebase_uid: "mock-firebase-uid-1",
          email: "operator1@test.local",
          username: "operator_one",
          first_name: "Alice",
          last_name: "Johnson",
          profile_photo_url: null,
          telegram_username: null,
          email_notifications_enabled: 1,
          is_active: 1,
          created_at: "2025-01-10 09:30:00",
          updated_at: "2025-01-10 09:30:00",
          last_login_at: undefined,
          role_name: "Water Utility Officer",
          role_type: "tech_officer",
        },
        {
          id: 1,
          firebase_uid: "mock-firebase-uid-1",
          email: "operator1@test.local",
          username: "operator_one",
          first_name: "Alice",
          last_name: "Johnson",
          profile_photo_url: null,
          telegram_username: null,
          email_notifications_enabled: 1,
          is_active: 1,
          created_at: "2025-01-10 09:30:00",
          updated_at: "2025-01-10 09:30:00",
          last_login_at: undefined,
          role_name: "Light Officer",
          role_type: "tech_officer",
        },
        {
          id: 2,
          firebase_uid: "mock-firebase-uid-2",
          email: "operator2@test.local",
          username: "operator_two",
          first_name: "Bob",
          last_name: "Miller",
          profile_photo_url: null,
          telegram_username: null,
          email_notifications_enabled: 1,
          is_active: 1,
          created_at: "2025-01-11 14:45:00",
          updated_at: "2025-01-11 14:45:00",
          last_login_at: undefined,
          role_name: "Public Relations Officer",
          role_type: "pub_relations",
        },
      ];

      const getAllSpy = vi.spyOn(db, "getAll").mockResolvedValueOnce(mockRows as any);

      const result: User[] = await dao.getOperators();
      expect(result).toEqual(mapUsersList(mockRows))
      expect(getAllSpy).toHaveBeenCalledTimes(1);
      expect(getAllSpy).toHaveBeenCalledWith(expect.stringContaining("JOIN user_roles"));
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
  // getAssigneeId
  // -------------------------
  describe("getAssigneeId", () => {
    it("returns the user id of the assignee with the fewest assigned reports", async () => {
      const mockAssignees = { id: 5, assigned_report_count: 2 };

      const getOneSpy = vi.spyOn(db, "getOne").mockResolvedValueOnce(mockAssignees);

      const result = await dao.getAssigneeId(1);

      expect(result).toBe(5);
      expect(getOneSpy).toHaveBeenCalledTimes(1);
      expect(getOneSpy).toHaveBeenCalledWith(expect.stringContaining("SELECT"), [1]);
    });

    it("throws an error if no assignee is found", async () => {
      vi.spyOn(db, "getOne").mockResolvedValueOnce([]);

      await expect(dao.getAssigneeId(1)).rejects.toThrow("No assignee found");
    });

    it("propagates database errors", async () => {
      vi.spyOn(db, "getOne").mockRejectedValueOnce(new Error("Database error"));
      await expect(dao.getAssigneeId(1)).rejects.toThrow("Database error");
    });
  });

  // -------------------------
  // getCategoriesOfOfficer
  // -------------------------
  describe("getCategoriesOfOfficer", () => {
    it("returns the category id of the officer", async () => {
      const mockCategories = [{ category_id: 3 }, { category_id: 5 }];
      const getAllSpy = vi.spyOn(db, "getAll").mockResolvedValueOnce(mockCategories);

      const result = await dao.getCategoriesOfOfficer(1);

      expect(result).toEqual([3, 5]);

      expect(getAllSpy).toHaveBeenCalledTimes(1);
      expect(getAllSpy).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        [1]
      );
    });


    it("returns undefined if no officer category is found", async () => {
      vi.spyOn(db, "getAll").mockResolvedValueOnce([]);

      const result = await dao.getCategoriesOfOfficer(10);

      expect(result).toEqual([])
    });

    it("propagates database errors", async () => {
      vi.spyOn(db, "getAll").mockRejectedValueOnce(
        new Error("DB failure")
      );

      await expect(dao.getCategoriesOfOfficer(10)).rejects.toThrow("DB failure");
    });
  });

  // -------------------------
  // Tests for getCategoryOfExternalMaintainer
  // -------------------------
  describe("getCategoryOfExternalMaintainer", () => {
    const externalMaintainerId = 15;

    it("returns the category id for a valid external maintainer", async () => {
      const mockCategories = [{ category_id: 3 }, { category_id: 5 }];

      const getAllSpy = vi.spyOn(db, "getAll").mockResolvedValueOnce(mockCategories);

      const result = await dao.getCategoriesOfExternalMaintainer(externalMaintainerId);

      expect(result).toEqual([3, 5]);
      expect(getAllSpy).toHaveBeenCalledTimes(1);
      expect(getAllSpy).toHaveBeenCalledWith(
        expect.stringContaining("JOIN companies c"),
        [externalMaintainerId]
      );

    });

    it("returns undefined if no category is found", async () => {
      vi.spyOn(db, "getAll").mockResolvedValueOnce([]);

      const result = await dao.getCategoriesOfExternalMaintainer(externalMaintainerId);

      expect(result).toEqual([]);
    });

    it("propagates database errors", async () => {
      vi.spyOn(db, "getAll").mockRejectedValueOnce(new Error("Database failure"));

      await expect(dao.getCategoriesOfExternalMaintainer(externalMaintainerId)).rejects.toThrow("Database failure");
    });
  });

  // -------------------------
  // getOperatorsByCategory
  // -------------------------
  describe("getOperatorsByCategory", () => {

    it("returns a list of operators in the given category", async () => {
      const mockRows = [
        {
          id: 7,
          firebase_uid: "uid-7",
          email: "tech1@example.com",
          username: "tech1",
          first_name: "Jane",
          last_name: "Roe",
          role_name: "Tech Officer",
          role_type: "tech_officer",
        },
        {
          id: 8,
          firebase_uid: "uid-8",
          email: "pubrel1@example.com",
          username: "pr1",
          first_name: "John",
          last_name: "Public",
          role_name: "Public Relations",
          role_type: "pub_relations",
        },
      ];

      vi.spyOn(db, "getAll").mockResolvedValueOnce(mockRows as any);

      const result: User[] = await dao.getOperatorsByCategory(2);

      expect(result).toEqual(mapUsersList(mockRows))

      expect(db.getAll).toHaveBeenCalledTimes(1);
      expect(db.getAll).toHaveBeenCalledWith(
        expect.stringContaining("JOIN user_roles"),
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

      await expect(dao.getOperatorsByCategory(2)).rejects.toThrow("Database crash");
    });

  });

  // -------------------------
  // getExternalMaintainers
  // -------------------------
  describe("getExternalMaintainersByFilter", () => {

    it("returns a list of external maintainers without filters", async () => {
      const mockRows = [
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
        },
      ];

      const expected: ExternalUserDTO[] = [
        {
          id: 7,
          fullName: "Jane Roe",
          username: "tech1",
          email: "tech1@example.com",
          companyId: 1,
          companyName: "Company A",
          roles: [
            { role_name: "Tech Officer", role_type: "external_maintainer" }
          ]
        },
        {
          id: 8,
          fullName: "John Public",
          username: "pr1",
          email: "pubrel1@example.com",
          companyId: 2,
          companyName: "Company B",
          roles: [
            { role_name: "Public Relations", role_type: "external_maintainer" }
          ]
        },
      ];

      vi.spyOn(db, "getAll").mockResolvedValueOnce(mockRows);

      const result = await dao.getExternalMaintainersByFilter();

      expect(result).toEqual(expected);
      expect(db.getAll).toHaveBeenCalledTimes(1);
      expect(db.getAll).toHaveBeenCalledWith(
        expect.stringContaining("r.type = 'external_maintainer'"),
        []
      );
    });

    it("applies filters correctly", async () => {
      const mockRows = [
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

      const expected: ExternalUserDTO[] = [
        {
          id: 9,
          fullName: "External User",
          username: "ext1",
          email: "external@example.com",
          companyId: 5,
          companyName: "Company B",
          roles: [
            { role_name: "External Maintainer", role_type: "external_maintainer" }
          ]
        },
      ];

      const filters = { companyId: 5, categoryId: 2 };
      vi.spyOn(db, "getAll").mockResolvedValueOnce(mockRows);

      const result = await dao.getExternalMaintainersByFilter(filters);

      expect(result).toEqual(expected);
      expect(db.getAll).toHaveBeenCalledTimes(1);
      expect(db.getAll).toHaveBeenCalledWith(
        expect.stringContaining(
          "r.type = 'external_maintainer' AND c.id = ? AND c.category_id = ?"
        ),
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

      await expect(dao.getExternalMaintainersByFilter()).rejects.toThrow(
        "Database crash"
      );
    });
  });


});

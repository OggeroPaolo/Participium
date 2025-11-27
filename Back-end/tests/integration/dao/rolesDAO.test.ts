import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import RolesDao from "../../../src/dao/RolesDao.js";
import * as db from "../../../src/config/database.js";

describe("RolesDao Integration Test Suite", () => {
  let dao: RolesDao;

  beforeEach(() => {
    dao = new RolesDao();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------
  // getRoles
  // ------------------------------
  describe("getRoles", () => {
    it("returns all operators", async () => {
      const mockRoles = [
        { name: "Citizen", type: "citizen" },
        { name: "Admin", type: "admin" },
      ];

      // Mock getAll to return mockRoles
      const getAllMock = vi.spyOn(db, "getAll").mockResolvedValueOnce(mockRoles);

      const result = await dao.getRoles();

      expect(result).toEqual(mockRoles);
      expect(getAllMock).toHaveBeenCalledTimes(1);
      expect(getAllMock).toHaveBeenCalledWith("SELECT * FROM roles WHERE type != \'admin\' AND type != \'citizen\'");
    });

    it("returns empty array if no roles found", async () => {
      vi.spyOn(db, "getAll").mockResolvedValueOnce([]);

      const result = await dao.getRoles();

      expect(result).toEqual([]);
    });

    it("throws error if getAll fails", async () => {
      const error = new Error("DB Error");
      vi.spyOn(db, "getAll").mockRejectedValueOnce(error);

      await expect(dao.getRoles()).rejects.toThrow("DB Error");
    });
  });
});

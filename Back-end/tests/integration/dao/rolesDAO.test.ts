import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import RolesDao from "../../../src/dao/RolesDao.js";
import * as db from "../../../src/config/database.js";
import { ROLES } from "../../../src/models/userRoles.js";

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
    it("returns all operator roles by default (excludes admin and citizen)", async () => {
      const mockRoles = [
        { name: "Public Relations", type: ROLES.PUB_RELATIONS },
        { name: "Tech Officer", type: ROLES.TECH_OFFICER },
      ];

      const getAllMock = vi
        .spyOn(db, "getAll")
        .mockResolvedValueOnce(mockRoles);

      const result = await dao.getRoles();

      expect(result).toEqual(mockRoles);
      expect(getAllMock).toHaveBeenCalledTimes(1);
      expect(getAllMock).toHaveBeenCalledWith(
        "SELECT * FROM roles WHERE type != ? AND type != ?",
        [ROLES.ADMIN, ROLES.CITIZEN]
      );
    });

    it("returns roles filtered by a specific type", async () => {
      const mockRoles = [
        { name: "Admin", type: ROLES.ADMIN },
      ];

      const getAllMock = vi
        .spyOn(db, "getAll")
        .mockResolvedValueOnce(mockRoles);

      const result = await dao.getRoles(ROLES.ADMIN);

      expect(result).toEqual(mockRoles);
      expect(getAllMock).toHaveBeenCalledWith(
        "SELECT * FROM roles WHERE type = ?",
        [ROLES.ADMIN]
      );
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

  // ------------------------------
  // getRolesByIds
  // ------------------------------
  describe("getRolesByIds", () => {
    it("returns roles for the given role IDs", async () => {
      const roleIds = [1, 2, 3];
      const mockRoles = [
        { id: 1, name: "Admin", type: "admin" },
        { id: 2, name: "Tech Officer", type: "tech_officer" },
        { id: 3, name: "Citizen", type: "citizen" },
      ];

      const getAllMock = vi
        .spyOn(db, "getAll")
        .mockResolvedValueOnce(mockRoles);

      const result = await dao.getRolesByIds(roleIds);

      expect(result).toEqual(mockRoles);
      expect(getAllMock).toHaveBeenCalledTimes(1);
      expect(getAllMock).toHaveBeenCalledWith(
        "SELECT * FROM roles WHERE id IN (?,?,?)",
        roleIds
      );
    });

    it("returns empty array when roleIds is empty", async () => {
      const getAllMock = vi.spyOn(db, "getAll");

      const result = await dao.getRolesByIds([]);

      expect(result).toEqual([]);
      expect(getAllMock).not.toHaveBeenCalled();
    });

    it("throws error if getAll fails", async () => {
      const roleIds = [1, 2];
      const error = new Error("DB Error");

      vi.spyOn(db, "getAll").mockRejectedValueOnce(error);

      await expect(dao.getRolesByIds(roleIds)).rejects.toThrow("DB Error");
    });
  });

});

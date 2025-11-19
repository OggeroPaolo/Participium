import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import CategoriesDao from "../../../src/dao/CategoriesDAO.js";
import * as db from "../../../src/config/database.js";

describe("CategoriesDao Unit Test Suite", () => {
  let dao: CategoriesDao;

  beforeEach(() => {
    dao = new CategoriesDao();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------
  // getCategories
  // ------------------------------
  describe("getCategories", () => {
    it("returns all categories", async () => {
      const mockCategories = [
        { id: 1, name: "Water Supply – Drinking Water", description: "Drinking water issues" },
        { id: 2, name: "Roads and Urban Furnishings", description: "Road conditions and potholes" },
      ];

      // Mock getAll to return mockCategories
      const getAllMock = vi.spyOn(db, "getAll").mockResolvedValueOnce(mockCategories);

      const result = await dao.getCategories();

      expect(result).toEqual(mockCategories);
      expect(getAllMock).toHaveBeenCalledTimes(1);
      expect(getAllMock).toHaveBeenCalledWith(
        `
      SELECT * FROM categories
    `
      );
    });

    it("returns empty array if no categories found", async () => {
      vi.spyOn(db, "getAll").mockResolvedValueOnce([]);

      const result = await dao.getCategories();

      expect(result).toEqual([]);
    });

    it("throws error if getAll fails", async () => {
      const error = new Error("DB Error");
      vi.spyOn(db, "getAll").mockRejectedValueOnce(error);

      await expect(dao.getCategories()).rejects.toThrow("DB Error");
    });
  });
});

import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeTestApp } from "../../setup/tests_util.js";
import categoriesRouter from "../../../src/routes/categories.routes.js";
import CategoriesDao from "../../../src/dao/CategoriesDAO.js";

// ---------------------------
// Mock Firebase middleware
// ---------------------------
vi.mock("../../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (_roles: string[]) => (_req: any, _res: any, next: any) => next(),
}));

let app: any;

beforeEach(() => {
  vi.clearAllMocks();
  app = makeTestApp(categoriesRouter);
});

describe("GET /categories (unit test)", () => {
  it("should return 200 with a list of categories", async () => {
    // Mock DAO method
    vi.spyOn(CategoriesDao.prototype, "getCategories").mockResolvedValue([
      { id: 1, name: "Water Supply – Drinking Water", description: "Issues related to water supply" },
      { id: 2, name: "Architectural Barriers", description: "Accessibility issues" },
    ]);

    const res = await request(app).get("/categories");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 1, name: "Water Supply – Drinking Water", description: "Issues related to water supply" },
      { id: 2, name: "Architectural Barriers", description: "Accessibility issues" },
    ]);
  });

  it("should return 204 if no categories exist", async () => {
    vi.spyOn(CategoriesDao.prototype, "getCategories").mockResolvedValue([]);

    const res = await request(app).get("/categories");

    expect(res.status).toBe(204);
    expect(res.body).toEqual({}); // 204 has no content
  });

  it("should return 500 if DAO throws an error", async () => {
    vi.spyOn(CategoriesDao.prototype, "getCategories").mockRejectedValue(new Error("DB failure"));

    const res = await request(app).get("/categories");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "DB failure" });
  });
});

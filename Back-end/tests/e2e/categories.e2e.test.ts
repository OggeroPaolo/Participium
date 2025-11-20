import request from "supertest";
import { Express } from "express";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import categoriesRouter from "../../src/routes/categories.routes.js";
import { makeTestApp, initTestDB, resetTestDB } from "../setup/tests_util.js";

// Mock Firebase middleware
vi.mock("../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (_roles: string[]) => (_req: any, _res: any, next: any) => next(),
}));

describe("GET /categories (E2E)", () => {
  let app: Express;

  beforeAll(async () => {
    await initTestDB(); // initialize DB with seeded categories
    app = makeTestApp(categoriesRouter);
  });

  afterEach(async () => {
    await resetTestDB(); // reset DB between tests
  });

  it("should return all seeded categories with 200", async () => {
    const res = await request(app).get("/categories");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const categoryNames = res.body.map((c: any) => c.name);
    expect(categoryNames).toContain("Water Supply – Drinking Water");
    expect(categoryNames).toContain("Architectural Barriers");
    expect(categoryNames).toContain("Other");
  });

it("should return 204 if no categories exist", async () => {
  const { runQuery } = await import("../../src/config/database.js");

  // Clear dependent data first
  await runQuery("DELETE FROM reports");
  await runQuery("DELETE FROM offices");

  // Clear categories
  await runQuery("DELETE FROM categories");

  const res = await request(app).get("/categories");
  expect(res.status).toBe(204);
});


  it("should return 500 if DAO throws an error", async () => {
    const CategoriesDao = (await import("../../src/dao/CategoriesDAO.js")).default;
    const spy = vi.spyOn(CategoriesDao.prototype, "getCategories").mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/categories");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "DB error" });

    spy.mockRestore();
  });
});

import request from "supertest";
import { Express } from "express";
import { describe, it, expect, vi, beforeAll, afterEach  } from "vitest";
import rolesRouter from "../../src/routes/roles.routes.js";
import RolesDao from "../../src/dao/RolesDAO.js";
import { initTestDB, makeTestApp, resetTestDB } from "../setup/tests_util.js";
import { runQuery } from "../../src/config/database.js";

// Mock firebase token verification middleware
vi.mock("../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (_roles: string[]) => (_req: any, _res: any, next: any) => next(),
}));

describe("GET /roles (E2E)", () => {
  let app: Express;

  beforeAll(async () => {
    await initTestDB();
    app = makeTestApp(rolesRouter);
  });

  afterEach(async () => {
    await resetTestDB();
    vi.restoreAllMocks();
  });

  it("should return a list of roles (200)", async () => {
    const expectedRoles = [
      { name: "Municipal_public_relations_officer", type: "pub_relations" },
      { name: "Water_utility_officer", type: "tech_officer" },
      { name: "Enel Worker", type: "external_maintainer" }
    ];

    const res = await request(app).get("/roles");

    expect(res.status).toBe(200);

    expect(Array.isArray(res.body)).toBe(true);
    expectedRoles.forEach(role => {
      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining(role)
        ])
      );
    });
  });


  it("should return 204 if no roles exist", async () => {

    //Clearing categories table (bypass foreign key constraints)
    await runQuery("PRAGMA foreign_keys = OFF");
    await runQuery("DELETE FROM roles");
    await runQuery("PRAGMA foreign_keys = ON");

    const res = await request(app).get("/roles");
    expect(res.status).toBe(204);
  });

  it("should return 500 if getRoles throws an error", async () => {
    const spy = vi
      .spyOn(RolesDao.prototype, "getRoles")
      .mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/roles");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "DB error" });

    spy.mockRestore();
  });
});

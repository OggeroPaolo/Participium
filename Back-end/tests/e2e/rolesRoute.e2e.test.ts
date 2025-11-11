import request from "supertest";
import { Express } from "express";
import { describe, it, expect, beforeEach, vi } from "vitest";
import rolesRouter from "../../src/routes/roles.routes.js";
import RolesDao from "../../src/dao/RolesDAO.js";
import { makeTestApp } from "../setup/tests_util.js";

// Mock firebase token verification middleware
vi.mock("../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (_roles: string[]) => (_req: any, _res: any, next: any) => next(),
}));

describe("GET /roles (E2E)", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = makeTestApp(rolesRouter);
  });

  it("should return a list of roles (200)", async () => {
    const mockRoles = [
      { id: 1, name: "Citizen" },
      { id: 2, name: "Operator" },
      { id: 4, name: "Admin" },
    ];

    const spy = vi
      .spyOn(RolesDao.prototype, "getRoles")
      .mockResolvedValue(mockRoles);

    const res = await request(app).get("/roles");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockRoles);

    spy.mockRestore();
  });

  it("should return 204 if no roles exist", async () => {
    const spy = vi
      .spyOn(RolesDao.prototype, "getRoles")
      .mockResolvedValue([]);

    const res = await request(app).get("/roles");

    expect(res.status).toBe(204);

    spy.mockRestore();
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

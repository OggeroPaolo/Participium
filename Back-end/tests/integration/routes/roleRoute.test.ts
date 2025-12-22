import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeTestApp } from "../../setup/tests_util.js";
import router from "../../../src/routes/roles.routes.js";
import RolesDao from "../../../src/dao/RolesDAO.js";
import { ROLES } from "../../../src/models/userRoles.js";

// ---------------------------
// Mock Firebase middleware
// ---------------------------
vi.mock("../../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (_roles: string[]) => (_req: any, _res: any, next: any) => next(),
}));

let app: any;

beforeEach(() => {
  vi.clearAllMocks();
  app = makeTestApp(router);
});

describe("GET /roles", () => {
  it("should return 200 with a list of roles", async () => {
    vi.spyOn(RolesDao.prototype, "getRoles").mockResolvedValue([
      { id: 1, name: "citizen", type: "user" },
      { id: 2, name: "operator", type: "operator" },
    ]);

    const res = await request(app).get("/roles");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 1, name: "citizen", type: "user" },
      { id: 2, name: "operator", type: "operator" },
    ]);
  });

  it("should return 200 with filtered roles if type query param is provided", async () => {
    const filteredRoles = [{ id: 2, name: "operator", type: ROLES.TECH_OFFICER }];
    vi.spyOn(RolesDao.prototype, "getRoles").mockResolvedValue(filteredRoles);

    const res = await request(app).get("/roles").query({ type: ROLES.TECH_OFFICER });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(filteredRoles);
    expect(RolesDao.prototype.getRoles).toHaveBeenCalledWith(ROLES.TECH_OFFICER);
  });

  it("should return 400 if an invalid type is provided", async () => {
    const res = await request(app).get("/roles").query({ type: "invalid_role" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid role type" });
  });

  it("should return 204 if no roles exist", async () => {
    vi.spyOn(RolesDao.prototype, "getRoles").mockResolvedValue([]);

    const res = await request(app).get("/roles");

    expect(res.status).toBe(204);
  });

  it("should return 500 if getRoles throws an error", async () => {
    vi.spyOn(RolesDao.prototype, "getRoles").mockRejectedValue(new Error("DB failure"));

    const res = await request(app).get("/roles");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "DB failure" });
  });
});

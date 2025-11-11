import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeTestApp } from "../../setup/tests_util.js";
import router from "../../../src/routes/roles.routes.js";
import RolesDao from "../../../src/dao/RolesDAO.js";

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

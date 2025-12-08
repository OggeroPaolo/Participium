import request from "supertest";
import { Express } from "express";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import reportsRouter from "../../src/routes/reports.routes.js";
import { makeTestApp } from "../setup/tests_util.js";
import { initTestDB, resetTestDB } from "../setup/tests_util.js";


const mock_user_id = 14;

// Mock Firebase middleware to simulate an authenticated user
vi.mock("../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: () => (req: any, _res: any, next: any) => {
    req.user = { id: mock_user_id, role_name: "ext_maintainer" };
    next();
  },
}));

describe("Reports E2E (External maintainer)", () => {
  let app: Express;

  beforeAll(async () => {
    await initTestDB();
    app = makeTestApp(reportsRouter);
  });

  afterEach(async () => {
    await resetTestDB();
    vi.restoreAllMocks();
  });
  // Tests for GET /ext_maintainer/reports
  describe("GET /ext_maintainer/reports", () => {
    it("should return 200 and a list of reports for external maintainer", async () => {
      const res = await request(app).get("/ext_maintainer/reports");
      expect(res.status).toBe(200);
    });
  });

});
import request from "supertest";
import { Express } from "express";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import reportsRouter from "../../src/routes/reports.routes.js";
import { makeTestApp } from "../setup/tests_util.js";
import { initTestDB, resetTestDB } from "../setup/tests_util.js";
import ReportDAO from "../../src/dao/ReportDAO.js";

const mock_user_id = 10;

// Mock Firebase middleware to simulate an authenticated tech officer
vi.mock("../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: () => (req: any, _res: any, next: any) => {
    req.user = { id: mock_user_id, role_name: "tech_officer" };
    next();
  },
}));

describe("Reports E2E (Tech Officer)", () => {
  let app: Express;

  beforeAll(async () => {
    await initTestDB();
    app = makeTestApp(reportsRouter);
  });

  afterEach(async () => {
    await resetTestDB();
    vi.restoreAllMocks();
  });

  describe("GET /tech_officer/reports", () => {
    it("should return 200 and a list of reports for external maintainer", async () => {
      const res = await request(app).get("/tech_officer/reports");
      expect(res.status).toBe(200);
    });
  });
});
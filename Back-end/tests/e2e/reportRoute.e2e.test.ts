import request from "supertest";
import { Express } from "express";
import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import reportsRouter from "../../src/routes/reports.routes.js";
import { makeTestApp } from "../setup/tests_util.js";
import { initTestDB, resetTestDB } from "../setup/tests_util.js";
import ReportDAO from "../../src/dao/ReportDAO.js";
import OperatorDAO from "../../src/dao/OperatorDAO.js";
import { Report } from "../../src/models/report.js";

// Mock Firebase middleware to simulate an authenticated user
vi.mock("../../src/middlewares/verifyFirebaseToken.js", () => ({
    verifyFirebaseToken: () => (req: any, _res: any, next: any) => {
        req.user = { id: 10, role_name: "pub_relations" }; // Mocked authenticated user
        next();
    },
}));

describe("Reports E2E", () => {
    let app: Express;

    beforeAll(async () => {
        await initTestDB();
        app = makeTestApp(reportsRouter);
    });

    afterEach(async () => {
        await resetTestDB();
        vi.restoreAllMocks();
    });

    describe("GET /reports/map", () => {
        it("should return mapped reports", async () => {
            // Mock DAO for E2E
            vi.spyOn(ReportDAO.prototype, "getMapReports").mockResolvedValue([
                {
                    id: 1,
                    title: "Broken streetlight",
                    first_name: "Alice",
                    last_name: "Smith",
                    position_lat: 51.5,
                    position_lng: -0.12,
                },
            ]);

            const res = await request(app).get("/reports/map");

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                reports: [
                    {
                        id: 1,
                        title: "Broken streetlight",
                        reporterName: "Alice Smith",
                        position: { lat: 51.5, lng: -0.12 },
                    },
                ],
            });
        });

        it("should return 204 when no reports exist", async () => {
            vi.spyOn(ReportDAO.prototype, "getMapReports").mockResolvedValue([]);

            const res = await request(app).get("/reports/map");

            expect(res.status).toBe(204);
            expect(res.body).toEqual({});
        });
    });

    describe("PATCH /pub_relations/reports/:reportId - Error cases", () => {
  const mockReport: Report = {
    id: 1,
    user_id: 2,
    category_id: 3,
    title: "Sample report",
    description: "Test description",
    status: "pending_approval",
    assigned_to: null,
    reviewed_by: null,
    reviewed_at: null,
    note: "Initial note",
    position_lat: 40.0,
    position_lng: -70.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("should return 400 if reportId is not an integer", async () => {
    const res = await request(app)
      .patch("/pub_relations/reports/abc")
      .send({ status: "assigned" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ errors: ["Report ID must be a valid integer"] });
  });

  it("should return 400 if status is invalid", async () => {
    const res = await request(app)
      .patch("/pub_relations/reports/1")
      .send({ status: "pending_approval" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ errors: ["Status must be one of: assigned, rejected"] });
  });

  it("should return 400 if note is missing when rejecting", async () => {
    const res = await request(app)
      .patch("/pub_relations/reports/1")
      .send({ status: "rejected" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ errors: ["A note is required when report is rejected"] });
  });

  it("should return 400 if categoryId is invalid", async () => {
    const res = await request(app)
      .patch("/pub_relations/reports/1")
      .send({ status: "assigned", categoryId: "abc" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ errors: ["categoryId must be an integer if passed"] });
  });

  it("should return 404 if report not found", async () => {
    vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(undefined);

    const res = await request(app)
      .patch("/pub_relations/reports/999")
      .send({ status: "assigned" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Report not found" });
  });

  it("should return 403 if report status is not pending_approval", async () => {
    const resolvedReport: Report = { ...mockReport, status: "assigned" };
    vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(resolvedReport);

    const res = await request(app)
      .patch("/pub_relations/reports/1")
      .send({ status: "assigned" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "You are not allowed to change status of a form which is not in the pending approval status",
    });
  });

  it("should return 500 if DAO update throws an error", async () => {
    vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReport);
    vi.spyOn(ReportDAO.prototype, "updateReportStatusAndAssign")
      .mockRejectedValue(new Error("DB failure"));

    const res = await request(app)
      .patch("/pub_relations/reports/1")
      .send({ status: "assigned" });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "DB failure" });
  });
});

});

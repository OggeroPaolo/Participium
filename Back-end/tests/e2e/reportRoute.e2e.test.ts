import request from "supertest";
import { Express } from "express";
import { describe, it, expect, beforeAll, afterEach, vi, beforeEach } from "vitest";
import reportsRouter from "../../src/routes/reports.routes.js";
import { makeTestApp } from "../setup/tests_util.js";
import { initTestDB, resetTestDB } from "../setup/tests_util.js";
import ReportDAO from "../../src/dao/ReportDAO.js";
import { Report } from "../../src/models/report.js";
import path from "path";
import cloudinary from "../../src/config/cloudinary.js";
import { ReportStatus } from "../../src/models/reportStatus.js";
import { Update } from "../../src/config/database.js";


const mock_user_id = 3;

//Use for clean up of Create Report test
let testUploadedUrls: string[] = [];
const testImg = path.join(__dirname, "../test_img/test.jpg");

// Mock Firebase middleware to simulate an authenticated user
vi.mock("../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: () => (req: any, _res: any, next: any) => {
    req.user = { id: mock_user_id, role_name: "pub_relations" };
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

  describe("GET /reports/map/accepted", () => {

    it("should return 200 with the accepted reports", async () => {
      const res = await request(app).get("/reports/map/accepted");
      expect(res.status).toBe(200);

      expect(res.body.reports).toContainEqual({
        id: 3,
        position: {
          lat: 45.06555,
          lng: 7.66233,
        },
        reporterName: "Jane Smith",
        reporterUsername: "JaneSmith",
        title: "Damaged Bollard",
      });
    });




    it("should return 204 when no reports exist", async () => {
      // Delete all reports
      await Update("PRAGMA foreign_keys = OFF");
      await Update("DELETE FROM reports");
      const res = await request(app).get("/reports/map/accepted");

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it("should return 500 if DAO throws an error", async () => {
      // Spy on DAO and force an error
      const daoSpy = vi.spyOn(ReportDAO.prototype, "getAcceptedReportsForMap")
        .mockRejectedValueOnce(new Error("DB failure"));

      const res = await request(app).get("/reports/map/accepted");
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });

      daoSpy.mockRestore(); // Clean up
    });
  });

  describe("GET /reports/:reportId", () => {
    const expectedReport = {
      id: 1,
      user: { id: 1, complete_name: 'John Doe', username: 'JohnDoe' },
      category: { id: 7, name: 'Roads and Urban Furnishings' },
      title: 'Neglected street corner',
      description: 'This area near Porta Nuova has been neglected and many people use it as a urinal, can something be done about it.',
      status: 'pending_approval',
      is_anonymous: false,
      position_lat: 45.0608,
      position_lng: 7.67613,
      photos: [
        {
          ordering: 1, url: "https://res.cloudinary.com/di9n3y9dd/raw/upload/fl_original/v1764143988/Participium-demo/z7z4f0oppqissfj2fd0y.jpg",
        },
      ],
    };

    it("should return 200 with report data (ignoring created_at and updated_at)", async () => {
      const res = await request(app).get("/reports/1");

      expect(res.status).toBe(200);

      const report = res.body.report;

      // Compare all keys except created_at and updated_at
      expect(report.id).toBe(expectedReport.id);
      expect(report.user).toEqual(expectedReport.user);
      expect(report.category).toEqual(expectedReport.category);
      expect(report.title).toBe(expectedReport.title);
      expect(report.description).toBe(expectedReport.description);
      expect(report.status).toBe(expectedReport.status);
      expect(report.is_anonymous).toBe(expectedReport.is_anonymous);
      expect(report.position_lat).toBe(expectedReport.position_lat);
      expect(report.position_lng).toBe(expectedReport.position_lng);
      expect(report.photos).toEqual(expectedReport.photos);
    });

    it("should return 404 if report not found", async () => {
      await Update("PRAGMA foreign_keys = OFF");
      await Update("DELETE FROM reports");

      const res = await request(app).get("/reports/999");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Report not found" });
    });

    it("should return 500 on server error", async () => {
      vi.spyOn(ReportDAO.prototype, "getCompleteReportById")
        .mockRejectedValueOnce(new Error("DB failure"));
      const res = await request(app).get("/reports/1");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });
    });
  });

  describe("GET /officers/:officerId/reports", () => {
    const expectedReports = [
      {
        title: "Water supply assigned",
        description: "Assigned to a technician for water supply issue.",
        user_id: 2,
        category_id: 1,
        position_lat: 45.0725,
        position_lng: 7.6824,
        status: "assigned",
        reviewed_by: 3,
        assigned_to: 5,
      },
    ];

    it("should return 200 and reports like expected", async () => {
      const officerId = 5;
      const res = await request(app).get(`/officers/${officerId}/reports`);

      expect(res.status).toBe(200);
      expect(res.body.reports).toHaveLength(expectedReports.length);

      res.body.reports.forEach((report: any, index: number) => {
        const { created_at, updated_at, ...rest } = report;
        expect(rest).toEqual(expect.objectContaining(expectedReports[index]));
      });
    });

    it("should return 204 when officer has no reports", async () => {
      const res = await request(app).get("/officers/99/reports");

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it("should return 500 on server error", async () => {
      // Spy on the DAO method and force it to throw
      const daoSpy = vi.spyOn(ReportDAO.prototype, "getReportsByFilters")
        .mockRejectedValueOnce(new Error("DB failure"));

      const res = await request(app).get("/officers/6/reports");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });
    });

  });

  describe("GET /reports?status=pending_approval", () => {

    const expectedReports = [
      {
        id: 1,
        user_id: 1,
        category_id: 7,
        title: "Neglected street corner",
        description: "This area near Porta Nuova has been neglected and many people use it as a urinal, can something be done about it.",
        status: ReportStatus.PendingApproval,
        assigned_to: null,
        reviewed_by: null,
        reviewed_at: null,
        note: null,
        is_anonymous: 0,
        position_lat: 45.0608,
        position_lng: 7.67613
      },
    ];

    it("should return 200 with pending_approval reports", async () => {
      const res = await request(app).get("/reports?status=pending_approval");

      expect(res.status).toBe(200);
      expect(res.body.reports.length).toBeGreaterThan(0); // at least one report

      // Compare only the first report ignoring created_at / updated_at
      const report = res.body.reports[0];
      const expected = expectedReports[0];
      (Object.keys(expected) as Array<keyof typeof expected>).forEach(key => {
        expect(report[key]).toEqual(expected[key]);
      });
    });


    it("should return 204 when no pending_approval reports exist", async () => {
      // Temporarily mock DAO to return empty array
      const spy = vi.spyOn(ReportDAO.prototype, "getReportsByFilters").mockResolvedValue([]);
      const res = await request(app).get("/reports?status=pending_approval");

      expect(res.status).toBe(204);
      expect(res.body).toEqual({}); // empty response
      spy.mockRestore();
    });

    it("should return 500 if DAO throws an error", async () => {
      const spy = vi.spyOn(ReportDAO.prototype, "getReportsByFilters").mockRejectedValue(new Error("DB failure"));
      const res = await request(app).get("/reports?status=pending_approval");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });
      spy.mockRestore();
    });

    it("should return 400 for invalid status filter", async () => {
      const res = await request(app).get("/reports?status=invalid_status");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "Invalid status filter: invalid_status" });
    });

  });


  describe("POST /reports", () => {
    afterEach(async () => {

      for (const url of testUploadedUrls) {
        try {
          if (!url || typeof url !== "string") continue;

          // Extract everything after /upload/v123/ and before extension
          const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^/.]+)?$/);

          if (!match) {
            console.warn("[CLEANUP] Could not extract publicId from:", url);
            continue;
          }

          // Remove any extension and add .jpg
          const publicId = match[1].replace(/\.[^/.]+$/, "") + ".jpg";

          await cloudinary.uploader.destroy(publicId, {
            resource_type: "raw"
          });
        } catch (err) {
          console.error("[CLEANUP ERROR]", err);
        }
      }


      testUploadedUrls = []; // reset after cleanup
    });

    it("should create a report with a real photo upload", async () => {
      const payload = {
        category_id: 1,
        title: "E2E Test Report",
        description: "Testing photo upload with Vitest",
        is_anonymous: 0,
        position_lat: 40.7128,
        position_lng: -74.0060,
      };

      const res = await request(app)
        .post("/reports")
        .field("category_id", payload.category_id.toString())
        .field("title", payload.title)
        .field("description", payload.description)
        .field("is_anonymous", payload.is_anonymous.toString())
        .field("position_lat", payload.position_lat.toString())
        .field("position_lng", payload.position_lng.toString())
        .attach("photos", testImg);

      expect(res.status).toBe(201);
      expect(res.body.report).toBeDefined();
      expect(res.body.report.photos).toHaveLength(1);

      testUploadedUrls = (res.body.report.photos || []).map(p =>
        typeof p === "string" ? p : p.url || p.photo_url
      );
    });

    it("should fail if no photos are uploaded", async () => {
      const payload = {
        category_id: 1,
        title: "No Photos Report",
        description: "Testing report without photos",
        is_anonymous: false,
        position_lat: 40.7128,
        position_lng: -74.0060,
      };

      const res = await request(app)
        .post("/reports")
        .field("category_id", payload.category_id.toString())
        .field("title", payload.title)
        .field("description", payload.description)
        .field("is_anonymous", payload.is_anonymous.toString())
        .field("position_lat", payload.position_lat.toString())
        .field("position_lng", payload.position_lng.toString());

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        errors: [
          {
            msg: "At least one photo is required",
            param: "photos",
          },
        ],
      });

      testUploadedUrls = []; // no cleanup required
    });

    it("should delete uploaded image if report creation fails", async () => {
      const createSpy = vi.spyOn(ReportDAO.prototype, "createReport").mockRejectedValue(new Error("Forced DB error"));
      const payload = {
        category_id: 1,
        title: "Report causing error",
        description: "This should trigger rollback",
        is_anonymous: false,
        position_lat: 40.7128,
        position_lng: -74.0060,
      }

      const res = await request(app)
        .post("/reports")
        .field("category_id", payload.category_id.toString())
        .field("title", payload.title)
        .field("description", payload.description)
        .field("is_anonymous", payload.is_anonymous.toString())
        .field("position_lat", payload.position_lat.toString())
        .field("position_lng", payload.position_lng.toString())
        .attach("photos", testImg);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });

      testUploadedUrls = [];
    });
  });


  describe("PATCH /pub_relations/reports/:reportId", () => {
    it("should return multiple validation errors together", async () => {
      const res = await request(app)
        .patch("/pub_relations/reports/xyz")
        .send({ status: "wrongStatus", categoryId: "abc" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        errors: [
          "Report ID must be a valid integer",
          "Status must be one of: assigned, rejected",
          "categoryId must be an integer if passed"
        ]
      });
    });

    it("should return 404 if report not found", async () => {

      const res = await request(app)
        .patch("/pub_relations/reports/999")
        .send({ status: ReportStatus.Assigned });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Report not found" });
    });

    it("should return 403 if report status is not pending_approval", async () => {

      const res = await request(app)
        .patch("/pub_relations/reports/3")
        .send({ status: ReportStatus.Assigned });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: "You are not allowed to change status of a form which is not in the pending approval status",
      });
    });

    it("should assign operator and return 200 ", async () => {
      const res = await request(app)
        .patch("/pub_relations/reports/1")
        .send({ status: ReportStatus.Assigned });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Report status updated successfully" });
    });

    it("should assign a specific operator and return 200 ", async () => {
      const res = await request(app)
        .patch("/pub_relations/reports/1")
        .send({ status: ReportStatus.Assigned, officerId: 10 });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Report status updated successfully" });
    });

    it("should return 403 if specific operator don't handle report category", async () => {
      const res = await request(app)
        .patch("/pub_relations/reports/1")
        .send({ status: "assigned", officerId: 5 });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: `The officer you want to assign to this report does not handle this category` });
    });

    it("should update the category, assign operator and return 200 ", async () => {
      const res = await request(app)
        .patch("/pub_relations/reports/1")
        .send({ status: ReportStatus.Assigned, categoryId: 1 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Report status updated successfully" });
    });

    it("should update the category, assign a specific operator and return 200 ", async () => {
      const res = await request(app)
        .patch("/pub_relations/reports/1")
        .send({ status: ReportStatus.Assigned, categoryId: 1, officerId: 5 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Report status updated successfully" });
    });

    it("should return 403 if specific operator don't handle the updated category ", async () => {
      const res = await request(app)
        .patch("/pub_relations/reports/1")
        .send({ status: ReportStatus.Assigned, categoryId: 1, officerId: 10 });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: `The officer you want to assign to this report does not handle this category` });
    });

    it("should set note to null if status is 'Assigned' and no note is provided", async () => {
      const res = await request(app)
        .patch("/pub_relations/reports/1")
        .send({ status: ReportStatus.Assigned, note: "This note will be ignored" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Report status updated successfully" });
    });

    it("should return 200 if status is 'rejected' and note is provided", async () => {
      const res = await request(app)
        .patch("/pub_relations/reports/1")
        .send({ status: ReportStatus.Rejected, note: "Insufficient details provided" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Report status updated successfully" });
    });
    it("should return 500 if DAO update throws an error", async () => {
      const mockReport: Report = {
        id: 1,
        user_id: 3,
        category_id: 3,
        title: "Sample report",
        description: "Description",
        status: ReportStatus.PendingApproval,
        assigned_to: null,
        reviewed_by: null,
        reviewed_at: null,
        note: "Initial note",
        position_lat: 40.0,
        position_lng: -70.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReport);
      vi.spyOn(ReportDAO.prototype, "updateReportStatusAndAssign").mockRejectedValue(new Error("DB failure"));

      const res = await request(app)
        .patch("/pub_relations/reports/1")
        .send({ status: "assigned" });

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "DB failure" });
    });
  });


  /*
  
    describe("PATCH /tech_officer/reports/:reportId/assign_external", () => {
    });
  
  
    describe.skip("PATCH /ext_maintainer/reports/:reportId", () => {
     
    });


  describe("GET /report/:reportId/internal-comments", () => {
    const mockReportId = 1;
    it("should assign report to external maintainer successfully", async () => {
      const res = await request(app)
        .get(`/report/${mockReportId}/internal-comments`)
      expect(res.status).toBe(200);
    });
  });
*/
});

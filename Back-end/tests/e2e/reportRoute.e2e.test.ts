import request from "supertest";
import { Express } from "express";
import { describe, it, expect, beforeAll, afterEach, vi, beforeEach } from "vitest";
import reportsRouter from "../../src/routes/reports.routes.js";
import { initTestDB, resetTestDB, makeTestApp } from "../setup/tests_util.js";
import ReportDAO from "../../src/dao/ReportDAO.js";
import { Report } from "../../src/models/report.js";
import path from "node:path";
import cloudinary from "../../src/config/cloudinary.js";
import { ReportStatus } from "../../src/models/reportStatus.js";
import { Update } from "../../src/config/database.js";
import CommentDAO from "../../src/dao/CommentDAO.js";



//Use for clean up of Create Report test
let testUploadedUrls: string[] = [];
const testImg = path.join(__dirname, "../test_img/test.jpg");
const hasRealCloudinaryKey =
  !!process.env.CLOUDINARY_API_KEY &&
  !process.env.CLOUDINARY_API_KEY.includes("your-cloudinary-api-key");

const mockTechOfficer = { id: 10, role_name: "tech_officer", role_type: "tech_officer" };
const mockExternalMaintainer = { id: 14, role_name: "external_maintainer", role_type: "external_maintainer" };
const mockCitizen = { id: 1, role_name: "Citizen", role_type: "citizen" };

vi.mock("../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (roles: string[]) => (req: any, _res: any, next: any) => {
    // Determine user based on route or default to tech officer
    if (req.path?.includes("ext_maintainer")) {
      req.user = mockExternalMaintainer;
    } else if (req.path?.includes("tech_officer")) {
      req.user = mockTechOfficer;
    } else {
      req.user = mockTechOfficer; // default
    }
    next();
  },
}));


describe("Reports E2E", () => {
  let app: Express;

  beforeAll(async () => {
    await initTestDB();
    app = makeTestApp(reportsRouter);
  });

  beforeEach(() => {
    // If no real Cloudinary credentials are configured, mock upload/destroy to avoid external calls.
    if (!hasRealCloudinaryKey) {
      vi.spyOn(cloudinary.uploader, "upload").mockImplementation(async (_path: string) => {
        return { secure_url: "https://example.com/mock-photo.jpg" } as any;
      });
      vi.spyOn(cloudinary.uploader, "destroy").mockResolvedValue({ result: "ok" } as any);
    }
  });

  afterEach(async () => {
    await resetTestDB();
    vi.restoreAllMocks();
  });

  describe("GET /reports/map/accepted", () => {

    it("should return 200 with the accepted reports", async () => {
      const res = await request(app).get("/reports/map/accepted");
      expect(res.status).toBe(200);

      expect(res.body.reports).toBeInstanceOf(Array);
      expect(res.body.reports.length).toBeGreaterThan(0);
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
      user: { id: 1, complete_name: "John Doe", username: "JohnDoe" },
      category: { id: 7, name: "Roads and Urban Furnishings" },
      title: "Neglected street corner",
      description:
        "This area near Porta Nuova has been neglected and many people use it as a urinal, can something be done about it.",
      status: "pending_approval",
      is_anonymous: false,
      address: "Via Paolo Sacchi 11, 10125 Torino",
      position_lat: 45.0608,
      position_lng: 7.67613,
      photos: [
        {
          ordering: 1,
          url: "https://res.cloudinary.com/di9n3y9dd/raw/upload/fl_original/v1764143988/Participium-demo/z7z4f0oppqissfj2fd0y.jpg",
        },
      ],
    };

    it("should return 200 with report data", async () => {
      const res = await request(app).get("/reports/1");

      expect(res.status).toBe(200);

      const report = res.body.report;

      // Remove fields we do NOT test
      const {
        created_at,
        updated_at,
        assigned_to,
        reviewed_by,
        external_user,
        ...cleaned
      } = report;

      expect(cleaned).toEqual(expectedReport);
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
        external_user: null,
        reviewed_by: null,
        reviewed_at: null,
        note: null,
        is_anonymous: 0,
        address: "Via Paolo Sacchi 11, 10125 Torino",
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
      await Update("PRAGMA foreign_keys = OFF");
      await Update("DELETE FROM reports");

      const res = await request(app).get("/reports?status=pending_approval");

      expect(res.status).toBe(204);
      expect(res.body).toEqual({}); // empty response
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
        address: "Broadway 260, 10000 New York",
        position_lat: 40.7128,
        position_lng: -74.006,
      };

      const res = await request(app)
        .post("/reports")
        .field("category_id", payload.category_id.toString())
        .field("title", payload.title)
        .field("description", payload.description)
        .field("is_anonymous", payload.is_anonymous.toString())
        .field("address", payload.address.toString())
        .field("position_lat", payload.position_lat.toString())
        .field("position_lng", payload.position_lng.toString())
        .attach("photos", testImg);
      expect(res.status).toBe(201);
      expect(res.body.report).toBeDefined();
      expect(res.body.report.photos).toHaveLength(1);

      testUploadedUrls = (res.body.report.photos || []).map((p: { url: any; photo_url: any; }) =>
        typeof p === "string" ? p : p.url || p.photo_url
      );
    });

    it("should fail if no photos are uploaded", async () => {
      const payload = {
        category_id: 1,
        title: "No Photos Report",
        description: "Testing report without photos",
        is_anonymous: false,
        address: "Broadway 260, 10000 New York",
        position_lat: 40.7128,
        position_lng: -74.006,
      };

      const res = await request(app)
        .post("/reports")
        .field("category_id", payload.category_id.toString())
        .field("title", payload.title)
        .field("description", payload.description)
        .field("is_anonymous", payload.is_anonymous.toString())
        .field("address", payload.address.toString())
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
      vi.spyOn(ReportDAO.prototype, "createReport").mockRejectedValue(new Error("Forced DB error"));
      const payload = {
        category_id: 1,
        title: "Report causing error",
        description: "This should trigger rollback",
        is_anonymous: false,
        address: "Broadway 260, 10000 New York",
        position_lat: 40.7128,
        position_lng: -74.006,
      }

      const res = await request(app)
        .post("/reports")
        .field("category_id", payload.category_id.toString())
        .field("title", payload.title)
        .field("description", payload.description)
        .field("is_anonymous", payload.is_anonymous.toString())
        .field("address", payload.address.toString())
        .field("position_lat", payload.position_lat.toString())
        .field("position_lng", payload.position_lng.toString())
        .attach("photos", testImg);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });

      testUploadedUrls = [];
    });

    it("should return 400 if some params are missing", async () => {
      const payload = {
        category_id: 1,
        title: "Report causing error",
        description: "This should trigger rollback",
        is_anonymous: false,
        address: "Broadway 260, 10000 New York",
        position_lat: 40.7128,
        position_lng: -74.006,
      }

      const res = await request(app)
        .post("/reports")
        .field("category_id", payload.category_id.toString())
        .field("title", payload.title)
        .field("position_lat", payload.position_lat.toString())
        .field("position_lng", payload.position_lng.toString())
        .attach("photos", testImg);

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();

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
      expect(res.body).toEqual({ error: `The officer you want to assign to this report does not handle this category or doesn't exist` });
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
        .send({ status: ReportStatus.Assigned, categoryId: 1, officerId: 6 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Report status updated successfully" });
    });

    it("should return 403 if specific operator don't handle the updated category ", async () => {
      const res = await request(app)
        .patch("/pub_relations/reports/1")
        .send({ status: ReportStatus.Assigned, categoryId: 1, officerId: 10 });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: `The officer you want to assign to this report does not handle this category or doesn't exist` });
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
        address: "Via vai 9, 10125 Torino",
        position_lat: 40,
        position_lng: -70,
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

  describe("GET /report/:reportId/internal-comments", () => {

    const reportId = 3;
    it("should return 200 with internal comments", async () => {
      const res = await request(app)
        .get(`/report/${reportId}/internal-comments`);

      expect(res.status).toBe(200);
      expect(res.body.comments.length).toBeGreaterThan(0);
    });

    it("should return 204 when no internal comments exist", async () => {
      const res = await request(app)
        .get(`/report/999/internal-comments`);

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it("should return 500 if DAO throws an error", async () => {
      const spy = vi
        .spyOn(CommentDAO.prototype, "getCommentsByReportIdAndType")
        .mockRejectedValue(new Error("DB failure"));

      const res = await request(app)
        .get(`/report/${reportId}/internal-comments`);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });

      spy.mockRestore();
    });

    it("should return 400 for invalid reportId", async () => {
      const res = await request(app)
        .get("/report/abc/internal-comments");

      expect(res.status).toBe(400);
    });

  });

  describe("GET /report/:reportId/external-comments", () => {

    const reportId = 3;

    it("should return 200 with external comments", async () => {
      const res = await request(app)
        .get(`/report/${reportId}/external-comments`);

      expect(res.status).toBe(200);
      expect(res.body.comments.length).toBeGreaterThan(0);
    });

    it("should return 204 when no external comments exist", async () => {
      const res = await request(app)
        .get(`/report/999/external-comments`);

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it("should return 500 if DAO throws an error", async () => {
      const spy = vi
        .spyOn(CommentDAO.prototype, "getCommentsByReportIdAndType")
        .mockRejectedValue(new Error("DB failure"));

      const res = await request(app)
        .get(`/report/${reportId}/external-comments`);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });

      spy.mockRestore();
    });

    it("should return 400 for invalid reportId", async () => {
      const res = await request(app)
        .get("/report/abc/external-comments");

      expect(res.status).toBe(400);
    });

  });

  describe("PATCH /tech_officer/reports/:reportId - E2E", () => {
    it("should return 404 if report does not exist", async () => {
      const res = await request(app)
        .patch("/tech_officer/reports/99999")
        .send({ status: ReportStatus.InProgress });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Report not found" });
    });

    it("should return 403 if status transition is not allowed", async () => {
      //Report with ID 1 is in 'pending_approval' status
      const res = await request(app)
        .patch("/tech_officer/reports/1")
        .send({ status: ReportStatus.InProgress });

      expect(res.status).toBe(403);
    });

    it("should return 403 if report is not assigned to this tech officer", async () => {
      // Report 8 is assigned to a different tech officer
      const res = await request(app)
        .patch("/tech_officer/reports/8")
        .send({ status: ReportStatus.InProgress });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: "You are not allowed to change status of a report that is not assigned to you"
      });
    });

    it("should update the status successfully", async () => {
      // Report 3 is assigned to the tech officer with status InProgress
      const res = await request(app)
        .patch("/tech_officer/reports/4")
        .send({ status: ReportStatus.Resolved });
      console.log(res.body);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: "Report status updated successfully"
      })
    });

    it("should return 400 for invalid status", async () => {
      const res = await request(app)
        .patch("/tech_officer/reports/3")
        .send({ status: "INVALID_STATUS" });

      expect(res.status).toBe(400);
    });
  });

});

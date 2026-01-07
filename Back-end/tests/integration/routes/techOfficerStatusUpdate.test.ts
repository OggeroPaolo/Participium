import request from "supertest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeTestApp, initTestDB, resetTestDB } from "../../setup/tests_util.js";
import router from "../../../src/routes/reports.routes.js";
import ReportDAO from "../../../src/dao/ReportDAO.js";
import NotificationDAO from "../../../src/dao/NotificationDAO.js";
import UserDAO from "../../../src/dao/UserDAO.js";
import CategoriesDAO from "../../../src/dao/CategoriesDAO.js";
import { ReportStatus } from "../../../src/models/reportStatus.js";
import { NotificationType } from "../../../src/models/NotificationType.js";
import { ROLES } from "../../../src/models/userRoles.js";
import { Notification } from "../../../src/models/notification.js";

const mockTechOfficer = { id: 10, roles: ["tech_officer"], role_type: ROLES.TECH_OFFICER };
const mockCitizen = { id: 1, roles: ["Citizen"], role_type: ROLES.CITIZEN };

vi.mock("../../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (roles: string[]) => (req: any, _res: any, next: any) => {
    if (req.path?.includes("tech_officer")) {
      req.user = mockTechOfficer;
    } else {
      req.user = mockCitizen;
    }
    next();
  },
}));

vi.mock("../../../src/realtime/realtimeGateway", () => ({
  getRealtimeGateway: () => ({
    notifyUser: vi.fn()
  })
}));

const mockNotification :Notification = {
  id: 1,
  user_id: 1,
  report_id: 1,
  type: NotificationType.StatusUpdate,
  title: "Test notification",
  comment_id: null,
  message: null,
  is_read: 0,
  created_at: ""
};

let app: any;
let reportDao: ReportDAO;
let notificationDao: NotificationDAO;
let userDao: UserDAO;
let categoryDao: CategoriesDAO;

describe("Technical Officer Status Update User Story Integration Tests", () => {
  describe("US: As a technical office staff member I want to update report statuses", () => {
    describe("So that citizens are informed of the problem resolution process", () => {
      beforeEach(async () => {
        await initTestDB();
        app = makeTestApp(router);
        reportDao = new ReportDAO();
        notificationDao = new NotificationDAO();
        userDao = new UserDAO();
        categoryDao = new CategoriesDAO();
        vi.clearAllMocks();
      });

      afterEach(async () => {
        await resetTestDB();
      });

      describe("Successful Status Updates", () => {
        it("should allow tech officer to update status from 'assigned' to 'in_progress'", async () => {
          // Get a category
          const categories = await categoryDao.getCategories();
          const category = categories[0];

          // Create a report (will be pending_approval by default)
          const reportData = {
            user_id: mockCitizen.id,
            category_id: category.id,
            title: "Water Leak Report",
            description: "Leakage in public water supply",
            address: "Via Roma 1, Torino",
            position_lat: 45.0703,
            position_lng: 7.6869,
            is_anonymous: false,
            photos: [],
          };

          const createdReport = await reportDao.createReport(reportData);
          
          // Set status to assigned and assign to tech officer
          await reportDao.updateReportStatusAndAssign(
            createdReport.id,
            ReportStatus.Assigned,
            mockCitizen.id, // reviewer
            undefined, // note
            undefined, // categoryId
            mockTechOfficer.id // assigneeId
          );

          // Mock notification creation - spy on prototype since route creates new instance
          const createNotificationSpy = vi.spyOn(NotificationDAO.prototype, "createNotification").mockResolvedValue(mockNotification);

          const res = await request(app)
            .patch(`/tech_officer/reports/${createdReport.id}`)
            .send({ status: ReportStatus.InProgress });

          expect(res.status).toBe(200);
          expect(res.body).toEqual({
            message: "Report status updated successfully",
          });

          // Verify status was updated in database
          const updatedReport = await reportDao.getReportById(createdReport.id);
          expect(updatedReport?.status).toBe(ReportStatus.InProgress);

          // Verify notification was created
          expect(createNotificationSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              user_id: mockCitizen.id,
              report_id: createdReport.id,
              type: NotificationType.StatusUpdate,
              title: expect.stringContaining(`The status of your report "${createdReport.title}" was set to ${ReportStatus.InProgress}`),
            })
          );
        });

        it("should allow tech officer to update status from 'in_progress' to 'resolved'", async () => {
          const categories = await categoryDao.getCategories();
          const category = categories[0];

          const reportData = {
            user_id: mockCitizen.id,
            category_id: category.id,
            title: "Fixed Road Issue",
            description: "Road pothole fixed",
            address: "Via Garibaldi 5, Torino",
            position_lat: 45.0703,
            position_lng: 7.6869,
            is_anonymous: false,
            photos: [],
          };

          const createdReport = await reportDao.createReport(reportData);
          
          // Set status to in_progress and assign to tech officer
          await reportDao.updateReportStatusAndAssign(
            createdReport.id,
            ReportStatus.InProgress,
            mockCitizen.id,
            undefined,
            undefined,
            mockTechOfficer.id
          );

          vi.spyOn(notificationDao, "createNotification").mockResolvedValue(mockNotification);

          const res = await request(app)
            .patch(`/tech_officer/reports/${createdReport.id}`)
            .send({ status: ReportStatus.Resolved });

          expect(res.status).toBe(200);
          expect(res.body).toEqual({
            message: "Report status updated successfully",
          });

          const updatedReport = await reportDao.getReportById(createdReport.id);
          expect(updatedReport?.status).toBe(ReportStatus.Resolved);
        });

        it("should allow tech officer to suspend a report in progress", async () => {
          const categories = await categoryDao.getCategories();
          const category = categories[0];

          const reportData = {
            user_id: mockCitizen.id,
            category_id: category.id,
            title: "Temporary Suspension",
            description: "Report temporarily suspended",
            address: "Via Po 10, Torino",
            position_lat: 45.0703,
            position_lng: 7.6869,
            is_anonymous: false,
            photos: [],
          };

          const createdReport = await reportDao.createReport(reportData);
          
          // Set status to in_progress and assign to tech officer
          await reportDao.updateReportStatusAndAssign(
            createdReport.id,
            ReportStatus.InProgress,
            mockCitizen.id,
            undefined,
            undefined,
            mockTechOfficer.id
          );

          vi.spyOn(notificationDao, "createNotification").mockResolvedValue(mockNotification);

          const res = await request(app)
            .patch(`/tech_officer/reports/${createdReport.id}`)
            .send({ status: ReportStatus.Suspended });

          expect(res.status).toBe(200);

          const updatedReport = await reportDao.getReportById(createdReport.id);
          expect(updatedReport?.status).toBe(ReportStatus.Suspended);
        });

        it("should create notification for citizen when status is updated", async () => {
          const categories = await categoryDao.getCategories();
          const category = categories[0];

          const reportData = {
            user_id: mockCitizen.id,
            category_id: category.id,
            title: "Notification Test Report",
            description: "Testing notification creation",
            address: "Via Test 1, Torino",
            position_lat: 45.0703,
            position_lng: 7.6869,
            is_anonymous: false,
            photos: [],
          };

          const createdReport = await reportDao.createReport(reportData);
          
          // Set status to assigned and assign to tech officer
          await reportDao.updateReportStatusAndAssign(
            createdReport.id,
            ReportStatus.Assigned,
            mockCitizen.id,
            undefined,
            undefined,
            mockTechOfficer.id
          );

          // Mock notification creation - spy on prototype since route creates new instance
          const createNotificationSpy = vi.spyOn(NotificationDAO.prototype, "createNotification").mockResolvedValue(mockNotification);

          await request(app)
            .patch(`/tech_officer/reports/${createdReport.id}`)
            .send({ status: ReportStatus.InProgress });

          expect(createNotificationSpy).toHaveBeenCalledTimes(1);
        });
      });

      describe("Authorization Checks", () => {
        it("should return 403 if report is not assigned to the tech officer", async () => {
          const categories = await categoryDao.getCategories();
          const category = categories[0];

          // Use a different user ID for testing authorization
          // Since we're using a real database, we can check if there's another user in seeded data
          // Or we can use citizen ID which should be valid but not assigned
          // Actually, the foreign key requires the user to exist, so let's use citizen ID
          // The authorization check will still work because assigned_to won't match mockTechOfficer.id
          const otherOfficerId = mockCitizen.id; // This will be valid FK but wrong assignment

          const reportData = {
            user_id: mockCitizen.id,
            category_id: category.id,
            title: "Unauthorized Report",
            description: "Not assigned to this officer",
            address: "Via Unauthorized 1, Torino",
            position_lat: 45.0703,
            position_lng: 7.6869,
            is_anonymous: false,
            photos: [],
          };

          const createdReport = await reportDao.createReport(reportData);
          
          // Set status to assigned and assign to different officer
          await reportDao.updateReportStatusAndAssign(
            createdReport.id,
            ReportStatus.Assigned,
            mockCitizen.id,
            undefined,
            undefined,
            otherOfficerId // Different officer
          );

          const res = await request(app)
            .patch(`/tech_officer/reports/${createdReport.id}`)
            .send({ status: ReportStatus.InProgress });

          expect(res.status).toBe(403);
          expect(res.body.error).toContain("not assigned to you");
        });

        it("should return 403 if report is not in an allowed status (assigned/in_progress/suspended)", async () => {
          const categories = await categoryDao.getCategories();
          const category = categories[0];

          const reportData = {
            user_id: mockCitizen.id,
            category_id: category.id,
            title: "Resolved Report",
            description: "Already resolved",
            address: "Via Resolved 1, Torino",
            position_lat: 45.0703,
            position_lng: 7.6869,
            is_anonymous: false,
            photos: [],
          };

          const createdReport = await reportDao.createReport(reportData);
          
          // Set status to resolved and assign to tech officer
          await reportDao.updateReportStatusAndAssign(
            createdReport.id,
            ReportStatus.Resolved,
            mockCitizen.id,
            undefined,
            undefined,
            mockTechOfficer.id
          );

          const res = await request(app)
            .patch(`/tech_officer/reports/${createdReport.id}`)
            .send({ status: ReportStatus.InProgress });

          expect(res.status).toBe(403);
          expect(res.body.error).toContain("not allowed to change status");
        });
      });

      describe("Validation Checks", () => {
        it("should return 404 if report does not exist", async () => {
          const res = await request(app)
            .patch(`/tech_officer/reports/99999`)
            .send({ status: ReportStatus.InProgress });

          expect(res.status).toBe(404);
          expect(res.body).toEqual({ error: "Report not found" });
        });

        it("should return 400 if status is invalid", async () => {
          const categories = await categoryDao.getCategories();
          const category = categories[0];

          const reportData = {
            user_id: mockCitizen.id,
            category_id: category.id,
            title: "Invalid Status Test",
            description: "Testing invalid status",
            address: "Via Invalid 1, Torino",
            position_lat: 45.0703,
            position_lng: 7.6869,
            is_anonymous: false,
            photos: [],
          };

          const createdReport = await reportDao.createReport(reportData);
          
          // Set status to assigned and assign to tech officer
          await reportDao.updateReportStatusAndAssign(
            createdReport.id,
            ReportStatus.Assigned,
            mockCitizen.id,
            undefined,
            undefined,
            mockTechOfficer.id
          );

          const res = await request(app)
            .patch(`/tech_officer/reports/${createdReport.id}`)
            .send({ status: "invalid_status" });

          expect(res.status).toBe(400);
        });

        it("should return 400 if status is missing", async () => {
          const categories = await categoryDao.getCategories();
          const category = categories[0];

          const reportData = {
            user_id: mockCitizen.id,
            category_id: category.id,
            title: "Missing Status Test",
            description: "Testing missing status",
            address: "Via Missing 1, Torino",
            position_lat: 45.0703,
            position_lng: 7.6869,
            is_anonymous: false,
            photos: [],
          };

          const createdReport = await reportDao.createReport(reportData);
          
          // Set status to assigned and assign to tech officer
          await reportDao.updateReportStatusAndAssign(
            createdReport.id,
            ReportStatus.Assigned,
            mockCitizen.id,
            undefined,
            undefined,
            mockTechOfficer.id
          );

          const res = await request(app)
            .patch(`/tech_officer/reports/${createdReport.id}`)
            .send({});

          expect(res.status).toBe(400);
        });
      });

      describe("Status Transition Flow", () => {
        it("should allow complete status transition flow: assigned -> in_progress -> resolved", async () => {
          const categories = await categoryDao.getCategories();
          const category = categories[0];

          const reportData = {
            user_id: mockCitizen.id,
            category_id: category.id,
            title: "Complete Flow Test",
            description: "Testing complete status flow",
            address: "Via Flow 1, Torino",
            position_lat: 45.0703,
            position_lng: 7.6869,
            is_anonymous: false,
            photos: [],
          };

          const createdReport = await reportDao.createReport(reportData);
          
          // Set status to assigned and assign to tech officer
          await reportDao.updateReportStatusAndAssign(
            createdReport.id,
            ReportStatus.Assigned,
            mockCitizen.id,
            undefined,
            undefined,
            mockTechOfficer.id
          );

          vi.spyOn(notificationDao, "createNotification").mockResolvedValue(mockNotification);

          // Step 1: assigned -> in_progress
          let res = await request(app)
            .patch(`/tech_officer/reports/${createdReport.id}`)
            .send({ status: ReportStatus.InProgress });

          expect(res.status).toBe(200);
          let updatedReport = await reportDao.getReportById(createdReport.id);
          expect(updatedReport?.status).toBe(ReportStatus.InProgress);

          // Step 2: in_progress -> resolved
          res = await request(app)
            .patch(`/tech_officer/reports/${createdReport.id}`)
            .send({ status: ReportStatus.Resolved });

          expect(res.status).toBe(200);
          updatedReport = await reportDao.getReportById(createdReport.id);
          expect(updatedReport?.status).toBe(ReportStatus.Resolved);
        });

        it("should allow status transition with suspension: assigned -> in_progress -> suspended -> in_progress", async () => {
          const categories = await categoryDao.getCategories();
          const category = categories[0];

          const reportData = {
            user_id: mockCitizen.id,
            category_id: category.id,
            title: "Suspension Flow Test",
            description: "Testing suspension flow",
            address: "Via Suspend 1, Torino",
            position_lat: 45.0703,
            position_lng: 7.6869,
            is_anonymous: false,
            photos: [],
          };

          const createdReport = await reportDao.createReport(reportData);
          
          // Set status to assigned and assign to tech officer
          await reportDao.updateReportStatusAndAssign(
            createdReport.id,
            ReportStatus.Assigned,
            mockCitizen.id,
            undefined,
            undefined,
            mockTechOfficer.id
          );

          vi.spyOn(notificationDao, "createNotification").mockResolvedValue(mockNotification);

          // assigned -> in_progress
          await request(app)
            .patch(`/tech_officer/reports/${createdReport.id}`)
            .send({ status: ReportStatus.InProgress });

          let updatedReport = await reportDao.getReportById(createdReport.id);
          expect(updatedReport?.status).toBe(ReportStatus.InProgress);

          // in_progress -> suspended
          await request(app)
            .patch(`/tech_officer/reports/${createdReport.id}`)
            .send({ status: ReportStatus.Suspended });

          updatedReport = await reportDao.getReportById(createdReport.id);
          expect(updatedReport?.status).toBe(ReportStatus.Suspended);

          // suspended -> in_progress (should be allowed since suspended is in allowed statuses)
          const res = await request(app)
            .patch(`/tech_officer/reports/${createdReport.id}`)
            .send({ status: ReportStatus.InProgress });

          expect(res.status).toBe(200);
          updatedReport = await reportDao.getReportById(createdReport.id);
          expect(updatedReport?.status).toBe(ReportStatus.InProgress);
        });
      });
    });
  });
});


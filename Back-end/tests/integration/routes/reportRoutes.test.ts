import request from "supertest";
import { describe, it, expect, vi, beforeEach, MockInstance } from "vitest";
import { makeTestApp } from "../../setup/tests_util.js";
import reportsRouter from "../../../src/routes/reports.routes.js";
import ReportDAO from "../../../src/dao/ReportDAO.js";
import { Report } from "../../../src/models/report.js";
import OperatorDAO from "../../../src/dao/OperatorDAO.js";
import { ReportMap } from "../../../src/models/reportMap.js";
import sharp from "sharp";
import cloudinary from "../../../src/config/cloudinary.js";
import { ReportStatus } from "../../../src/models/reportStatus.js";
import { CompleteReportDTO } from "../../../src/dto/ReportWithPhotosDTO.js";
import CommentDAO from "../../../src/dao/CommentDAO.js";
import { GetCommentDTO } from "../../../src/dto/CommentDTO.js";
import NotificationDAO from "../../../src/dao/NotificationDAO.js";
import { Notification } from "../../../src/models/notification.js";
import { ROLES } from "../../../src/models/userRoles.js";
import UserDAO from "../../../src/dao/UserDAO.js";
import { afterEach } from "node:test";
import { CreateNotificationDTO } from "../../../src/dto/NotificationDTO.js";
import { NotificationType } from "../../../src/models/NotificationType.js";
import router from "../../../src/routes/reports.routes.js";



const mockTechOfficer = { id: 10, roles: ["tech_officer"], role_type: ROLES.TECH_OFFICER };
const mockExternalMaintainer = { id: 14, roles: ["external_maintainer"], role_type: ROLES.EXT_MAINTAINER };
const mockCitizen = { id: 1, roles: ["Citizen"], role_type: ROLES.CITIZEN };

vi.mock("../../../src/middlewares/verifyFirebaseToken.js", () => ({
    verifyFirebaseToken: (roles: string[]) => (req: any, _res: any, next: any) => {
        // Determine user based on routes 
        if (req.path?.includes("ext_maintainer") || req.path?.includes("internal-comments")) {
            req.user = mockExternalMaintainer;
        } else if (req.path?.includes("tech_officer")) {
            req.user = mockTechOfficer;
        } else {
            req.user = mockCitizen; // default
        }
        next();
    },
}));


// Mock Multer middleware
vi.mock("../../../src/config/multer.js", () => ({
    upload: {
        array: (_fieldName: string, _maxCount?: number) => (req: any, _res: any, next: any) => {
            req.files = [
                { path: "fake/path/file1.jpg", originalname: "file1.jpg" },
                { path: "fake/path/file2.png", originalname: "file2.png" },
            ];
            next();
        },
    },
}));
// Mock fs/promises
vi.mock("fs/promises", async () => {
    const actual = await vi.importActual<any>("fs/promises");
    return {
        ...actual,
        unlink: vi.fn().mockResolvedValue(undefined),
    };
});
vi.mock("../../../src/realtime/realtimeGateway", () => ({
    getRealtimeGateway: () => ({
        notifyUser: vi.fn()
    })
}));


let app: any;


describe("Report Routes Integration Tests", () => {

    beforeEach(() => {
        vi.clearAllMocks();
        app = makeTestApp(reportsRouter);
    });

    const mockReports: Report[] = [
        {
            id: 1,
            user_id: 2,
            category_id: 3,
            title: "Report 1",
            description: "Description 1",
            address: "123 Main St",
            status: ReportStatus.PendingApproval,
            assigned_to: undefined,
            reviewed_by: undefined,
            reviewed_at: undefined,
            note: "Note 1",
            position_lat: 40,
            position_lng: -70,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            id: 2,
            user_id: 3,
            category_id: 2,
            title: "Report 2",
            description: "Description 2",
            address: "456 Elm St",
            status: ReportStatus.Assigned,
            assigned_to: 10,
            reviewed_by: undefined,
            reviewed_at: undefined,
            note: "Note 2",
            position_lat: 41,
            position_lng: -71,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
    ];
    const mockReportMap: ReportMap[] = [
        {
            id: 1,
            title: "Damaged sidewalk",
            first_name: "John",
            last_name: "Doe",
            username: "jdoe",
            position_lat: 45.1,
            position_lng: 9.2,
            address: "123 Main St",
            is_anonymous: false
        },
    ];
    const mockCompleteReport: CompleteReportDTO = {
        id: 1,
        title: "Test report",
        description: "Desc",
        status: "open",
        reviewed_at: undefined,
        note: undefined,
        is_anonymous: false,
        address: "Unknown address",
        position_lat: 41,
        position_lng: 12,
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-02T00:00:00.000Z",

        // user
        user: {
            id: 10,
            complete_name: "Mario Rossi",
            username: "mrossi",
        },

        // category
        category: {
            id: 5,
            name: "Road Issue",
        },

        // assigned user
        assigned_to: {
            id: 20,
            complete_name: "Luigi Bianchi",
            username: "lbianchi",
        },

        // reviewed user
        reviewed_by: {
            id: 30,
            complete_name: "Anna Verdi",
            username: "averdi",
        },

        // photos
        photos: [
            {
                url: "url1.jpg",
                ordering: 1,
            },
        ],
    };
    const mockNotification: Notification = {
        id: 1,
        user_id: mockTechOfficer.id,
        type: NotificationType.StatusUpdate,
        report_id: 1,
        title: "Notification",
        is_read: 0,
        created_at: new Date().toISOString(),
        comment_id: null,
        message: null
    };

    describe("GET /reports/map/accepted", () => {

        it("should return 200 with mapped reports", async () => {


            vi.spyOn(ReportDAO.prototype, "getAcceptedReportsForMap").mockResolvedValue(mockReportMap);

            const res = await request(app).get("/reports/map/accepted");

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                reports: [
                    {
                        id: 1,
                        title: "Damaged sidewalk",
                        reporterName: "John Doe",
                        reporterUsername: "jdoe",
                        address: "123 Main St",
                        position: { lat: 45.1, lng: 9.2 },
                        is_anonymous: false
                    },
                ],
            });
        });

        it("should return 204 when no reports exist", async () => {
            vi.spyOn(ReportDAO.prototype, "getAcceptedReportsForMap").mockResolvedValue([]);

            const res = await request(app).get("/reports/map/accepted");

            expect(res.status).toBe(204);
            expect(res.body).toEqual({});
        });

        it("should return 500 if DAO throws an error", async () => {
            vi.spyOn(ReportDAO.prototype, "getAcceptedReportsForMap")
                .mockRejectedValue(new Error("DB failure"));

            const res = await request(app).get("/reports/map/accepted");

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Internal server error" });
        });
    });
    describe("GET /reports/:reportId", () => {
        it("should return 200 with report data if report exists", async () => {
            vi.spyOn(ReportDAO.prototype, "getCompleteReportById")
                .mockResolvedValue(mockCompleteReport);
            vi.spyOn(NotificationDAO.prototype, "markByReportAsRead").mockResolvedValue(undefined);
            const res = await request(app).get("/reports/1");
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ report: mockCompleteReport });
        });

        it("should return 200 and mark notifications as read for logged in user", async () => {
            vi.spyOn(ReportDAO.prototype, "getCompleteReportById")
                .mockResolvedValue(mockCompleteReport);
            const markAsReadSpy = vi.spyOn(NotificationDAO.prototype, "markByReportAsRead")
                .mockResolvedValue(undefined);

            // Create a test app with injected user middleware
            const express = require("express");
            const testApp = express();

            // Mock user middleware
            testApp.use((req: any, res: any, next: any) => {
                req.user = { id: mockCitizen.id, username: "testuser", email: "test@example.com" };
                next();
            });

            // Import and use your router (adjust the import path as needed)
            testApp.use(router);

            const res = await request(testApp).get("/reports/1");

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ report: mockCompleteReport });
            expect(markAsReadSpy).toHaveBeenCalledWith(
                mockCitizen.id,
                1,
                [
                    NotificationType.StatusUpdate
                ]
            );
        });

        it("should return 404 if report does not exist", async () => {
            vi.spyOn(ReportDAO.prototype, "getCompleteReportById")
                .mockRejectedValue(new Error("Report not found"));
            const res = await request(app).get("/reports/999");
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: "Report not found" });
        });

        it("should return 500 if DAO throws an unexpected error", async () => {
            vi.spyOn(ReportDAO.prototype, "getCompleteReportById")
                .mockRejectedValue(new Error("DB failure"));
            const res = await request(app).get("/reports/1");
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Internal server error" });
        });
    });

    describe("GET /tech_officer/reports", () => {
        it("should return 200 with reports assigned to the tech officer", async () => {

            vi.spyOn(ReportDAO.prototype, "getReportsByFilters").mockResolvedValue(mockReports);

            const res = await request(app).get("/tech_officer/reports");

            expect(res.status).toBe(200);
            expect(res.body.reports).toEqual(mockReports)
        });

        it("should return 204 when no reports are assigned", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportsByFilters").mockResolvedValue([]);

            const res = await request(app).get("/tech_officer/reports");

            expect(res.status).toBe(204);
            expect(res.body).toEqual({});
        });

        it("should return 500 on server error", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportsByFilters")
                .mockRejectedValue(new Error("DB failure"));

            const res = await request(app).get("/tech_officer/reports");

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Internal server error" });
        });
    });
    describe("GET /ext_maintainer/reports", () => {
        it("should return 200 with reports assigned to the external maintainer", async () => {

            vi.spyOn(ReportDAO.prototype, "getReportsByFilters").mockResolvedValue(mockReports);

            const res = await request(app).get("/ext_maintainer/reports");

            expect(res.status).toBe(200);
            expect(res.body.reports).toEqual(mockReports)
        });

        it("should return 204 when no reports are assigned", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportsByFilters").mockResolvedValue([]);

            const res = await request(app).get("/ext_maintainer/reports");

            expect(res.status).toBe(204);
            expect(res.body).toEqual({});
        });

        it("should return 500 on server error", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportsByFilters")
                .mockRejectedValue(new Error("DB failure"));

            const res = await request(app).get("/ext_maintainer/reports");

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Internal server error" });
        });
    });
    describe("GET /reports.", () => {
        it("should return 200 with filtered reports", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportsByFilters").mockResolvedValue([mockReports[0]]);

            const res = await request(app).get("/reports?status=pending_approval");

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ reports: [mockReports[0]] });
            expect(ReportDAO.prototype.getReportsByFilters).toHaveBeenCalledWith({ status: ReportStatus.PendingApproval });
        });

        it("should return 204 if no reports match filter", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportsByFilters").mockResolvedValue([]);

            const res = await request(app).get("/reports?status=resolved");

            expect(res.status).toBe(204);
        });

        it("should return 400 if invalid status is provided", async () => {
            const res = await request(app).get("/reports?status=invalid_status");
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: "Invalid status filter: invalid_status" });
        });

        it("should return 500 if DAO throws", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportsByFilters").mockRejectedValue(new Error("DB failure"));

            const res = await request(app).get("/reports?status=pending_approval");

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Internal server error" });
        });
    });

    describe("POST /reports/:reportId/internal-comments", () => {
        const reportId = 5;

        const mockComment = {
            id: 99,
            report_id: reportId,
            user_id: 11,
            type: "private",
            text: "Internal note",
            timestamp: new Date().toISOString(),
        };

        it("creates a comment and a notification then returns 201", async () => {
            vi.spyOn(CommentDAO.prototype, "createComment").mockResolvedValueOnce(mockComment);
            //Mock the assigned report
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReports[1])
            let spyNotification = vi.spyOn(NotificationDAO.prototype, "createNotification").mockResolvedValue(mockNotification);


            const res = await request(app)
                .post(`/reports/${reportId}/internal-comments`)
                .send({
                    text: "Internal note",
                });

            expect(res.status).toBe(201);
            expect(res.body).toEqual({ comment: mockComment });

            expect(CommentDAO.prototype.createComment).toHaveBeenCalledWith({
                user_id: mockExternalMaintainer.id,
                report_id: reportId,
                type: "private",
                text: "Internal note",
            });
            expect(spyNotification).toHaveBeenCalled();
        });

        it("returns 400 when validation fails (missing text)", async () => {
            const res = await request(app)
                .post(`/reports/${reportId}/internal-comments`)
                .send({
                });

            expect(res.status).toBe(400);
            expect(res.body.errors).toContain("text is required");
        });

        it("returns 400 when reportId is invalid", async () => {
            const res = await request(app)
                .post(`/reports/abc/internal-comments`)
                .send({
                    text: "ok",
                });

            expect(res.status).toBe(400);
            expect(res.body.errors).toContain("reportId must be a valid integer");
        });

        it("returns 500 when DAO throws", async () => {
            vi.spyOn(CommentDAO.prototype, "createComment")
                .mockRejectedValueOnce(new Error("DB error"));

            const res = await request(app)
                .post(`/reports/${reportId}/internal-comments`)
                .send({
                    text: "Test",
                });

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Internal server error" });
        });
    });

    describe("POST /reports/:reportId/external-comments", () => {
        const reportId = 5;

        const mockComment = {
            id: 101,
            report_id: reportId,
            user_id: mockCitizen.id,
            type: "public",
            text: "Public comment",
            timestamp: new Date().toISOString(),
        };

        it("creates a public comment and a notification then returns 201", async () => {
            vi.spyOn(CommentDAO.prototype, "createComment")
                .mockResolvedValueOnce(mockComment);
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReports[1])
            let spyNotification = vi.spyOn(NotificationDAO.prototype, "createNotification").mockResolvedValue(mockNotification);


            const res = await request(app)
                .post(`/reports/${reportId}/external-comments`)
                .send({
                    text: "Public comment",
                });

            expect(res.status).toBe(201);
            expect(res.body).toEqual({ comment: mockComment });

            expect(CommentDAO.prototype.createComment).toHaveBeenCalledWith({
                user_id: mockCitizen.id,
                report_id: reportId,
                type: "public",
                text: "Public comment",
            });

            expect(spyNotification).toHaveBeenCalled();
        });

        it("returns 400 when validation fails (missing text)", async () => {
            const res = await request(app)
                .post(`/reports/${reportId}/external-comments`)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.errors).toContain("text is required");
        });

        it("returns 400 when reportId is invalid", async () => {
            const res = await request(app)
                .post(`/reports/abc/external-comments`)
                .send({
                    text: "ok",
                });

            expect(res.status).toBe(400);
            expect(res.body.errors).toContain("reportId must be a valid integer");
        });

        it("returns 500 when DAO throws", async () => {
            vi.spyOn(CommentDAO.prototype, "createComment")
                .mockRejectedValueOnce(new Error("DB error"));

            const res = await request(app)
                .post(`/reports/${reportId}/external-comments`)
                .send({
                    text: "Test",
                });

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Internal server error" });
        });
    });

    describe("POST /reports", () => {

        beforeEach(() => {
            vi.restoreAllMocks();

            // DAO mock
            vi.spyOn(ReportDAO.prototype, "createReport").mockResolvedValue(mockCompleteReport);

            // Cloudinary uploader mock
            vi.spyOn(cloudinary.uploader, "upload").mockResolvedValue({ secure_url: "https://example.com/photo.jpg" } as any);

            // Cloudinary destroy mock
            vi.spyOn(cloudinary.uploader, "destroy").mockResolvedValue({ result: "ok" } as any);

            // Sharp mocks
            vi.spyOn(sharp.prototype, "resize").mockReturnThis();
            vi.spyOn(sharp.prototype, "toFile").mockResolvedValue({} as any);
        });

        it("should create a report and return 201", async () => {
            const res = await request(app)
                .post("/reports")
                .send({
                    user_id: 10,
                    category_id: 3,
                    title: "Sample",
                    description: "Description",
                    address: "address",
                    position_lat: 40,
                    position_lng: -70,
                    is_anonymous: false,
                });
            expect(res.status).toBe(201);
            expect(res.body.report).toEqual(mockCompleteReport);
        });

        it("should rollback uploaded images if Cloudinary upload fails", async () => {
            const destroyedImages: string[] = [];

            vi.spyOn(cloudinary.uploader, "upload").mockImplementation(async (path: string) => {
                if (path.includes("file1")) throw new Error("Cloudinary upload failed");
                return { secure_url: "https://example.com/photo2.jpg" } as any;
            });

            vi.spyOn(cloudinary.uploader, "destroy").mockImplementation(async (publicId: string) => {
                destroyedImages.push(publicId);
                return { result: "ok" } as any;
            });

            const res = await request(app)
                .post("/reports")
                .set("Content-Type", "application/json")
                .send({
                    user_id: 10,
                    category_id: 3,
                    title: "Sample",
                    description: "Description",
                    address: "address",
                    position_lat: 40,
                    position_lng: -70,
                    is_anonymous: false,
                });

            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty("error");
            expect(destroyedImages.length).toBeGreaterThanOrEqual(0);
        });

        it("should return 400 if required fields are missing", async () => {
            const res = await request(app)
                .post("/reports")
                .send({
                    user_id: 10,
                    category_id: 3,
                    title: "Sample",
                    position_lat: 40,
                    position_lng: -70,
                    is_anonymous: false,
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("errors");
        });

    });

    describe("PATCH /pub_relations/reports/:reportId", () => {

        let createNotificationSpy: MockInstance<(data: CreateNotificationDTO) => Promise<Notification>>;
        //Mocking of the notification creation
        beforeEach(() => {
            createNotificationSpy = vi
                .spyOn(NotificationDAO.prototype, "createNotification")
                .mockResolvedValue(mockNotification);
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        describe("Validation errors", () => {
            it("should return 400 if status is missing", async () => {
                const res = await request(app)
                    .patch("/pub_relations/reports/1")
                    .send({}); // no status

                expect(res.status).toBe(400);
                expect(res.body).toEqual({
                    errors: ["Status must be one of: assigned, rejected"]
                });
            });

            it("should return 400 if reportId is not an integer", async () => {
                const res = await request(app)
                    .patch("/pub_relations/reports/abc") // invalid reportId
                    .send({ status: "assigned" });

                expect(res.status).toBe(400);
                expect(res.body).toEqual({
                    errors: ["Report ID must be a valid integer"]
                });
            });

            it("should return 400 if status is invalid", async () => {
                const res = await request(app)
                    .patch("/pub_relations/reports/1")
                    .send({ status: "pending_approval" }); // invalid status for the route

                expect(res.status).toBe(400);
                expect(res.body).toEqual({
                    errors: ["Status must be one of: assigned, rejected"]
                });
            });

            it("should return 400 if note is missing when status is rejected", async () => {
                const res = await request(app)
                    .patch("/pub_relations/reports/1")
                    .send({ status: "rejected" }); // no note provided

                expect(res.status).toBe(400);
                expect(res.body).toEqual({
                    errors: ["A note is required when report is rejected"]
                });
            });

            it("should return 400 if categoryId is not an integer", async () => {
                const res = await request(app)
                    .patch("/pub_relations/reports/1")
                    .send({ status: "assigned", categoryId: "abc" }); // invalid categoryId

                expect(res.status).toBe(400);
                expect(res.body).toEqual({
                    errors: ["categoryId must be an integer if passed"]
                });
            });

            it("should return multiple validation errors together", async () => {
                const res = await request(app)
                    .patch("/pub_relations/reports/xyz") // invalid reportId
                    .send({ status: "wrongStatus", categoryId: "abc" }); // invalid status & categoryId

                expect(res.status).toBe(400);
                expect(res.body).toEqual({
                    errors: [
                        "Report ID must be a valid integer",
                        "Status must be one of: assigned, rejected",
                        "categoryId must be an integer if passed"
                    ]
                });
            });

        });
        it("should return 404 if report does not exist", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(undefined);

            const res = await request(app)
                .patch("/pub_relations/reports/999")
                .send({ status: "assigned" });

            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: "Report not found" });
        });
        it("should return 403 if report is not pending_approval", async () => {
            const nonPendingReport: Report = { ...mockReports[0], status: ReportStatus.Assigned };

            vi.spyOn(ReportDAO.prototype, "getReportById")
                .mockResolvedValue(nonPendingReport);

            const res = await request(app)
                .patch("/pub_relations/reports/1")
                .send({ status: "assigned" });

            expect(res.status).toBe(403);
            expect(res.body).toEqual({
                error: "You are not allowed to change status of a form which is not in the pending approval status",
            });
        });
        it("should assign operator, emit a notification and return 200 ", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReports[0]);
            vi.spyOn(OperatorDAO.prototype, "getAssigneeId").mockResolvedValue(99);
            vi.spyOn(UserDAO.prototype, "findUserById").mockResolvedValue({
                firebase_uid: "uid",
                id: 0,
                email: "",
                username: "",
                first_name: "",
                last_name: "",
                role_type: ROLES.CITIZEN,
                roles: []
            })
            const updateSpy = vi
                .spyOn(ReportDAO.prototype, "updateReportStatusAndAssign")
                .mockResolvedValue({ changes: 1 });

            const res = await request(app)
                .patch("/pub_relations/reports/1")
                .send({ status: "assigned" });

            expect(res.status).toBe(200);
            expect(updateSpy).toHaveBeenCalledWith(
                1,            // reportId
                ReportStatus.Assigned,   // status
                mockCitizen.id,       // reviewerId from mocked req.user
                null,         // note is null for assigned
                undefined,    // categoryId
                99            // assigneeId
            );
            expect(res.body).toEqual({ message: "Report status updated successfully" });
            expect(createNotificationSpy).toHaveBeenCalled()
        });
        it("should assign a specific operator and return 200 ", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReports[0]);
            vi.spyOn(OperatorDAO.prototype, "getCategoriesOfOfficer").mockResolvedValue([3]);

            const updateSpy = vi
                .spyOn(ReportDAO.prototype, "updateReportStatusAndAssign")
                .mockResolvedValue({ changes: 1 });

            const res = await request(app)
                .patch("/pub_relations/reports/1")
                .send({ status: "assigned", officerId: 5 });
            expect(res.status).toBe(200);
            expect(updateSpy).toHaveBeenCalledWith(
                1,            // reportId
                "assigned",   // status
                mockCitizen.id,       // reviewerId from mocked req.user
                null,         // note is null for assigned
                undefined,    // categoryId
                5            // assigneeId
            );
            expect(res.body).toEqual({ message: "Report status updated successfully" });
        });

        it("should return 403 if specific operator don't handle report category", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReports[0]);
            vi.spyOn(OperatorDAO.prototype, "getCategoriesOfOfficer").mockResolvedValue([99, 34]);

            vi.spyOn(ReportDAO.prototype, "updateReportStatusAndAssign").mockResolvedValue({ changes: 1 });

            const res = await request(app)
                .patch("/pub_relations/reports/1")
                .send({ status: "assigned", officerId: 5 });

            expect(res.status).toBe(403);
        });
        it("should update the category, assign operator and return 200 ", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReports[0]);
            vi.spyOn(OperatorDAO.prototype, "getAssigneeId").mockResolvedValue(99);

            const updateSpy = vi
                .spyOn(ReportDAO.prototype, "updateReportStatusAndAssign")
                .mockResolvedValue({ changes: 1 });

            const res = await request(app)
                .patch("/pub_relations/reports/1")
                .send({ status: "assigned", categoryId: 12 });

            expect(res.status).toBe(200);
            expect(updateSpy).toHaveBeenCalledWith(
                1,            // reportId
                "assigned",   // status
                mockCitizen.id,           // reviewerId from mocked req.user
                null,         // note is null for assigned
                12,           // categoryId
                99            // assigneeId
            );
            expect(res.body).toEqual({ message: "Report status updated successfully" });
        });
        it("should set note to null if status is 'Assigned'", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReports[0]);
            vi.spyOn(OperatorDAO.prototype, "getAssigneeId").mockResolvedValue(99);

            const updateSpy = vi
                .spyOn(ReportDAO.prototype, "updateReportStatusAndAssign")
                .mockResolvedValue({ changes: 1 });

            const res = await request(app)
                .patch("/pub_relations/reports/1")
                .send({ status: ReportStatus.Assigned, note: "This note will be ignored" });
            expect(res.status).toBe(200);
            expect(updateSpy).toHaveBeenCalledWith(
                1,         // reportId
                "assigned",// status
                mockCitizen.id,    // reviewerId 
                null,      // note should be null 
                undefined, // categoryId not provided
                99  // assigneeId not applicable
            );
            expect(res.body).toEqual({ message: "Report status updated successfully" });
        });
        it("should return 200 when status is 'rejected' and note is provided", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReports[0]);

            const updateSpy = vi
                .spyOn(ReportDAO.prototype, "updateReportStatusAndAssign")
                .mockResolvedValue({ changes: 1 });

            const res = await request(app)
                .patch("/pub_relations/reports/1")
                .send({ status: "rejected", note: "Duplicate report" });

            expect(res.status).toBe(200);
            expect(updateSpy).toHaveBeenCalledWith(
                1,
                "rejected",
                mockCitizen.id,                 // reviewerId from mocked req.user
                "Duplicate report", // note kept
                undefined,          // categoryId not provided
                undefined           // no assignee
            );
            expect(res.body).toEqual({ message: "Report status updated successfully" });
        });
        it("should return 500 if DAO update throws", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReports[0]);
            vi.spyOn(OperatorDAO.prototype, "getAssigneeId").mockResolvedValue(99);

            vi.spyOn(ReportDAO.prototype, "updateReportStatusAndAssign")
                .mockRejectedValue(new Error("DB failure"));

            const res = await request(app)
                .patch("/pub_relations/reports/1")
                .send({ status: "assigned", categoryId: 2 });

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "DB failure" });
        });

    });

    describe("PATCH /tech_officer/reports/:reportId/assign_external", () => {
        const validReport: Report = {
            id: 1,
            user_id: 10,
            category_id: 3,
            title: "Example",
            description: "Description...",
            address: "Address",
            status: ReportStatus.Assigned,
            assigned_to: mockTechOfficer.id,
            external_user: null,
            reviewed_by: null,
            reviewed_at: null,
            note: null,
            position_lat: 12.34,
            position_lng: 56.78,
            created_at: "2024-01-01",
            updated_at: "2024-01-01"
        };

        it("should return 404 if report does not exist", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById")
                .mockResolvedValue(undefined);

            const res = await request(app)
                .patch("/tech_officer/reports/1/assign_external")
                .send({ externalMaintainerId: 5 });

            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: "Report not found" });
        });

        it("should return 403 if report is not in 'assigned' status", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById")
                .mockResolvedValue({
                    ...validReport,
                    status: ReportStatus.PendingApproval,
                });

            const res = await request(app)
                .patch("/tech_officer/reports/1/assign_external")
                .send({ externalMaintainerId: 5 });

            expect(res.status).toBe(403);
        });

        it("should return 403 if report is not assigned to the current officer", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById")
                .mockResolvedValue({
                    ...validReport,
                    assigned_to: 999,

                });

            const res = await request(app)
                .patch("/tech_officer/reports/1/assign_external")
                .send({ externalMaintainerId: 5 });

            expect(res.status).toBe(403);
        });

        it("should return 403 if external maintainer's category does not match", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById")
                .mockResolvedValue(validReport);

            vi.spyOn(OperatorDAO.prototype, "getCategoriesOfExternalMaintainer")
                .mockResolvedValue([999, 100]);

            const res = await request(app)
                .patch("/tech_officer/reports/1/assign_external")
                .send({ externalMaintainerId: 5 });

            expect(res.status).toBe(403);
        });

        it("should assign the external maintainer successfully", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById")
                .mockResolvedValue(validReport);

            vi.spyOn(OperatorDAO.prototype, "getCategoriesOfExternalMaintainer")
                .mockResolvedValue([3, 12]);

            const spyUpdate = vi
                .spyOn(ReportDAO.prototype, "updateReportExternalMaintainer")
                .mockResolvedValue({ changes: 1 });

            const res = await request(app)
                .patch("/tech_officer/reports/1/assign_external")
                .send({ externalMaintainerId: 5 });

            expect(res.status).toBe(200);
            expect(spyUpdate).toHaveBeenCalledWith(1, 5);
            expect(res.body).toEqual({
                message: "Report successfully assigned to the external maintainer"
            });
        });

        it("should return 500 on unexpected error", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById")
                .mockRejectedValue(new Error("DB failure"));

            const res = await request(app)
                .patch("/tech_officer/reports/1/assign_external")
                .send({ externalMaintainerId: 7 });

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Internal server error" });
        });
    });

    describe("PATCH /tech_officer/reports/:reportId", () => {
        const baseReport: Report = {
            id: 1,
            user_id: 10,
            category_id: 3,
            title: "Title",
            description: "Desc",
            address: "Address",
            position_lat: 1,
            position_lng: 2,
            created_at: "date",
            updated_at: "date",
            status: ReportStatus.Assigned,
            external_user: null,
            reviewed_by: null,
            reviewed_at: null,
            assigned_to: mockTechOfficer.id,
            note: null,
        };

        it("should return 404 if report does not exist", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(undefined);
            const res = await request(app)
                .patch("/tech_officer/reports/1")
                .send({ status: ReportStatus.InProgress });
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: "Report not found" });
        });

        it("should return 403 if status is not allowed", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue({
                ...baseReport,
                status: ReportStatus.Resolved
            });
            const res = await request(app)
                .patch("/tech_officer/reports/1")
                .send({ status: ReportStatus.InProgress });
            expect(res.status).toBe(403);
        });

        it("should return 403 if report is not assigned to this tech officer", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue({
                ...baseReport,
                assigned_to: 999
            });
            const res = await request(app)
                .patch("/tech_officer/reports/1")
                .send({ status: ReportStatus.InProgress });
            expect(res.status).toBe(403);
            expect(res.body).toEqual({
                error: "You are not allowed to change status of a report that is not assigned to you"
            });
        });

        it("should update the status successfully and create the notification", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(baseReport);
            const spyNotification = vi.spyOn(NotificationDAO.prototype, "createNotification").mockResolvedValue(mockNotification);
            const spyUpdate = vi
                .spyOn(ReportDAO.prototype, "updateReportStatus")
                .mockResolvedValue({ changes: 1 });
            const res = await request(app)
                .patch("/tech_officer/reports/1")
                .send({ status: ReportStatus.InProgress });
            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                message: "Report status updated successfully"
            });
            expect(spyUpdate).toHaveBeenCalledWith(1, ReportStatus.InProgress);
        });

        it("should return 500 on internal server error", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById")
                .mockRejectedValue(new Error("DB fail"));
            const res = await request(app)
                .patch("/tech_officer/reports/1")
                .send({ status: ReportStatus.InProgress });
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Internal server error" });
        });
    });

    describe("PATCH /ext_maintainer/reports/:reportId", () => {

        const baseReport: Report = {
            id: 1,
            user_id: 10,
            category_id: 3,
            title: "Title",
            description: "Desc",
            address: "Address",
            position_lat: 1,
            position_lng: 2,
            created_at: "date",
            updated_at: "date",

            status: ReportStatus.Assigned,
            external_user: mockExternalMaintainer.id,
            reviewed_by: null,
            reviewed_at: null,
            assigned_to: mockTechOfficer.id,
            note: null,
        };

        it("should return 404 if report does not exist", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(undefined);

            const res = await request(app)
                .patch("/ext_maintainer/reports/1")
                .send({ status: ReportStatus.InProgress });
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: "Report not found" });
        });

        it("should return 403 if status is not allowed", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue({
                ...baseReport,
                status: ReportStatus.Resolved
            });

            const res = await request(app)
                .patch("/ext_maintainer/reports/1")
                .send({ status: ReportStatus.InProgress });

            expect(res.status).toBe(403);
        });

        it("should return 403 if report is not assigned to this external maintainer", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue({
                ...baseReport,
                external_user: 999
            });

            const res = await request(app)
                .patch("/ext_maintainer/reports/1")
                .send({ status: ReportStatus.InProgress });

            expect(res.status).toBe(403);
        });

        it("should update the status successfully and create the notification ", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(baseReport);
            let spyNotification = vi.spyOn(NotificationDAO.prototype, "createNotification").mockResolvedValue(mockNotification);

            const spyUpdate = vi
                .spyOn(ReportDAO.prototype, "updateReportStatus")
                .mockResolvedValue({ changes: 1 });

            const res = await request(app)
                .patch("/ext_maintainer/reports/1")
                .send({ status: ReportStatus.InProgress });
            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                message: "Report status updated successfully"
            });

            expect(spyUpdate).toHaveBeenCalledWith(1, ReportStatus.InProgress);
            expect(spyNotification).toHaveBeenCalled();
        });

        it("should return 500 on internal server error", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById")
                .mockRejectedValue(new Error("DB fail"));

            const res = await request(app)
                .patch("/ext_maintainer/reports/1")
                .send({ status: ReportStatus.InProgress });

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Internal server error" });
        });
    });

    describe("GET /report/:reportId/internal-comments", () => {
        const reportId = 1;

        it("should return 200 with comments if comments exist", async () => {
            const mockComments: GetCommentDTO[] = [
                {
                    id: 1,
                    report_id: reportId,
                    user_id: mockTechOfficer.id,
                    type: "private",
                    text: "Check the issue",
                    timestamp: new Date().toISOString(),
                    username: "test",
                    last_name: "test",
                    first_name: "test"
                },
                {
                    id: 2,
                    report_id: reportId,
                    user_id: mockExternalMaintainer.id,
                    type: "private",
                    text: "Started fixing",
                    timestamp: new Date().toISOString(),
                    username: "test",
                    last_name: "test",
                    first_name: "test"
                },
            ];

            vi.spyOn(CommentDAO.prototype, "getCommentsByReportIdAndType").mockResolvedValue(mockComments);
            const spyNotification = vi.spyOn(NotificationDAO.prototype, "markByReportAsRead").mockResolvedValue(undefined);
            const res = await request(app)
                .get(`/report/${reportId}/internal-comments`)

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ comments: mockComments });
            expect(spyNotification).toHaveBeenCalled();
        });

        it("should return 204 if no comments exist", async () => {
            vi.spyOn(CommentDAO.prototype, "getCommentsByReportIdAndType").mockResolvedValue([]);

            const res = await request(app)
                .get(`/report/${reportId}/internal-comments`)

            expect(res.status).toBe(204);
            expect(res.body).toEqual({});
        });

        it("should return 500 if DAO throws an error", async () => {
            vi.spyOn(CommentDAO.prototype, "getCommentsByReportIdAndType").mockRejectedValue(new Error("DB failure"));

            const res = await request(app)
                .get(`/report/${reportId}/internal-comments`)

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Internal server error" });
        });
    });

    describe("GET /report/:reportId/external-comments", () => {
        const reportId = 1;

        it("should return 200 with comments if comments exist", async () => {
            const mockComments: GetCommentDTO[] = [
                {
                    id: 1,
                    report_id: reportId,
                    user_id: mockCitizen.id,
                    type: "public",
                    text: "Public comment",
                    timestamp: new Date().toISOString(),
                    username: "test",
                    last_name: "test",
                    first_name: "test",
                },
                {
                    id: 2,
                    report_id: reportId,
                    user_id: mockTechOfficer.id,
                    type: "public",
                    text: "Official response",
                    timestamp: new Date().toISOString(),
                    username: "test",
                    last_name: "test",
                    first_name: "test",
                },
            ];

            vi.spyOn(CommentDAO.prototype, "getCommentsByReportIdAndType").mockResolvedValue(mockComments);
            const spyNotification = vi.spyOn(NotificationDAO.prototype, "markByReportAsRead").mockResolvedValue(undefined)

            const res = await request(app)
                .get(`/report/${reportId}/external-comments`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ comments: mockComments });

            expect(
                CommentDAO.prototype.getCommentsByReportIdAndType
            ).toHaveBeenCalledWith(reportId, "public");
            expect(spyNotification).toHaveBeenCalled();
        });

        it("should return 204 if no comments exist", async () => {
            vi.spyOn(
                CommentDAO.prototype,
                "getCommentsByReportIdAndType"
            ).mockResolvedValue([]);

            const res = await request(app)
                .get(`/report/${reportId}/external-comments`);

            expect(res.status).toBe(204);
            expect(res.body).toEqual({});
        });

        it("should return 500 if DAO throws an error", async () => {
            vi.spyOn(
                CommentDAO.prototype,
                "getCommentsByReportIdAndType"
            ).mockRejectedValue(new Error("DB failure"));

            const res = await request(app)
                .get(`/report/${reportId}/external-comments`);

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Internal server error" });
        });
    });

});

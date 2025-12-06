import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
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

const mock_user_id = 3;
// Mock Firebase middleware
vi.mock("../../../src/middlewares/verifyFirebaseToken.js", () => ({
    verifyFirebaseToken: () => (req: any, _res: any, next: any) => {
        req.user = { id: mock_user_id, role_name: "pub_relations" };
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
    describe("GET /reports/map/accepted", () => {

        it("should return 200 with mapped reports", async () => {
            const mockReports: ReportMap[] = [
                {
                    id: 1,
                    title: "Damaged sidewalk",
                    first_name: "John",
                    last_name: "Doe",
                    username: "jdoe",
                    position_lat: 45.1,
                    position_lng: 9.2,
                },
            ];

            vi.spyOn(ReportDAO.prototype, "getAcceptedReportsForMap").mockResolvedValue(mockReports);

            const res = await request(app).get("/reports/map/accepted");

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                reports: [
                    {
                        id: 1,
                        title: "Damaged sidewalk",
                        reporterName: "John Doe",
                        reporterUsername: "jdoe",
                        position: { lat: 45.1, lng: 9.2 },
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
        const mockReport: CompleteReportDTO = {
            id: 1,
            title: "Test report",
            description: "Desc",
            status: "open",
            reviewed_at: undefined,
            note: undefined,
            is_anonymous: false,
            position_lat: 41.0,
            position_lng: 12.0,
            created_at: "2025-01-01T00:00:00.000Z",
            updated_at: "2025-01-02T00:00:00.000Z",

            // user
            user_id: 10,
            user_first_name: "Mario",
            user_last_name: "Rossi",
            user_username: "mrossi",

            // category
            category_id: 5,
            category_name: "Road Issue",

            // assigned user
            assigned_user_id: 20,
            assigned_first_name: "Luigi",
            assigned_last_name: "Bianchi",
            assigned_username: "lbianchi",

            // reviewed user
            reviewed_user_id: 30,
            reviewed_first_name: "Anna",
            reviewed_last_name: "Verdi",
            reviewed_username: "averdi",

            // first photo
            photo_url: "url1.jpg",
            photos_ordering: 1

        };

        it("should return 200 with report data if report exists", async () => {
            vi.spyOn(ReportDAO.prototype, "getCompleteReportById")
                .mockResolvedValue(mockReport);

            const res = await request(app).get("/reports/1");

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ report: mockReport });
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
    describe("GET /officers/:officerId/reports", () => {
        it("should return 200 with reports for officer", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportsByFilters").mockResolvedValue([mockReports[1]]);

            const res = await request(app).get("/officers/10/reports");

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ reports: [mockReports[1]] });
            expect(ReportDAO.prototype.getReportsByFilters).toHaveBeenCalledWith({ officerId: 10 });
        });

        it("should return 204 if officer has no reports", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportsByFilters").mockResolvedValue([]);

            const res = await request(app).get("/officers/99/reports");

            expect(res.status).toBe(204);
        });

        it("should return 500 if DAO throws", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportsByFilters").mockRejectedValue(new Error("DB failure"));

            const res = await request(app).get("/officers/10/reports");

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
    describe("POST /reports", () => {
        const mockCreatedReport = {
            id: 1,
            user_id: 10,
            category_id: 3,
            title: "Sample",
            description: "Description",
            status: "pending_approval",
            position_lat: 40.0,
            position_lng: -70.0,
            photos: [{ url: "https://example.com/photo.jpg", ordering: 1 }],
            is_anonymous: false,
            assigned_to: undefined,
            reviewed_by: undefined,
            reviewed_at: undefined,
            note: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        beforeEach(() => {
            vi.restoreAllMocks();

            // DAO mock
            vi.spyOn(ReportDAO.prototype, "createReport").mockResolvedValue(mockCreatedReport);

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
                .set("Content-Type", "application/json")
                .send({
                    user_id: 10,
                    category_id: 3,
                    title: "Sample",
                    description: "Description",
                    position_lat: 40.0,
                    position_lng: -70.0,
                    is_anonymous: false,
                });

            expect(res.status).toBe(201);
            expect(res.body.report).toEqual(mockCreatedReport);
        });

        it(
            "should rollback uploaded images if Cloudinary upload fails",
            async () => {
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
                        position_lat: 40.0,
                        position_lng: -70.0,
                        is_anonymous: false,
                    });

                expect(res.status).toBe(500);
                expect(res.body).toHaveProperty("error");
                expect(destroyedImages.length).toBeGreaterThanOrEqual(0);
            }
        );

    });

    describe("PATCH /pub_relations/reports/:reportId", () => {
        const mockReport: Report = {
            id: 1,
            user_id: mock_user_id,
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
            const nonPendingReport: Report = { ...mockReport, status: ReportStatus.Assigned };

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


        it("should assign operator and return 200 ", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReport);
            vi.spyOn(OperatorDAO.prototype, "getAssigneeId").mockResolvedValue(99);

            const updateSpy = vi
                .spyOn(ReportDAO.prototype, "updateReportStatusAndAssign")
                .mockResolvedValue({ changes: 1 });

            const res = await request(app)
                .patch("/pub_relations/reports/1")
                .send({ status: "assigned" });

            expect(res.status).toBe(200);
            expect(updateSpy).toHaveBeenCalledWith(
                1,            // reportId
                "assigned",   // status
                mock_user_id,       // reviewerId from mocked req.user
                null,         // note is null for assigned
                undefined,    // categoryId
                99            // assigneeId
            );
            expect(res.body).toEqual({ message: "Report status updated successfully" });
        });
        it("should assign a specific operator and return 200 ", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReport);
            vi.spyOn(OperatorDAO.prototype, "getCategoryOfOfficer").mockResolvedValue(3);

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
                mock_user_id,       // reviewerId from mocked req.user
                null,         // note is null for assigned
                undefined,    // categoryId
                5            // assigneeId
            );
            expect(res.body).toEqual({ message: "Report status updated successfully" });
        });

        it("should return 403 if specific operator don't handle report category", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReport);
            vi.spyOn(OperatorDAO.prototype, "getCategoryOfOfficer").mockResolvedValue(4);

            const updateSpy = vi
                .spyOn(ReportDAO.prototype, "updateReportStatusAndAssign")
                .mockResolvedValue({ changes: 1 });

            const res = await request(app)
                .patch("/pub_relations/reports/1")
                .send({ status: "assigned", officerId: 5 });

            expect(res.status).toBe(403);
            expect(res.body).toEqual({ error: `The officer you want to assign to this report does not handle this category` });
        });
        it("should update the category, assign operator and return 200 ", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReport);
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
                mock_user_id,           // reviewerId from mocked req.user
                null,         // note is null for assigned
                12,           // categoryId
                99            // assigneeId
            );
            expect(res.body).toEqual({ message: "Report status updated successfully" });
        });

        it("should set note to null if status is 'Assigned'", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReport);
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
                mock_user_id,    // reviewerId 
                null,      // note should be null 
                undefined, // categoryId not provided
                99  // assigneeId not applicable
            );
            expect(res.body).toEqual({ message: "Report status updated successfully" });
        });


        it("should return 200 when status is 'rejected' and note is provided", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReport);

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
                mock_user_id,                 // reviewerId from mocked req.user
                "Duplicate report", // note kept
                undefined,          // categoryId not provided
                undefined           // no assignee
            );
            expect(res.body).toEqual({ message: "Report status updated successfully" });
        });

        it("should return 500 if DAO update throws", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReport);
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
        const validReport = {
            id: 1,
            user_id: 10,
            category_id: 3,
            title: "Example",
            description: "Description...",
            status: ReportStatus.Assigned,
            assigned_to: mock_user_id,
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
                    status: ReportStatus.PendingApproval
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
                    assigned_to: 999
                });

            const res = await request(app)
                .patch("/tech_officer/reports/1/assign_external")
                .send({ externalMaintainerId: 5 });

            expect(res.status).toBe(403);
        });

        it("should return 403 if external maintainer's category does not match", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById")
                .mockResolvedValue(validReport);

            vi.spyOn(OperatorDAO.prototype, "getCategoryOfExternalMaintainer")
                .mockResolvedValue(999);

            const res = await request(app)
                .patch("/tech_officer/reports/1/assign_external")
                .send({ externalMaintainerId: 5 });

            expect(res.status).toBe(403);
        });

        it("should assign the external maintainer successfully", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById")
                .mockResolvedValue(validReport);

            vi.spyOn(OperatorDAO.prototype, "getCategoryOfExternalMaintainer")
                .mockResolvedValue(3);

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

    describe("PATCH /ext_maintainer/reports/:reportId", () => {

        vi.mock("../../src/middlewares/verifyFirebaseToken.js", () => ({
            verifyFirebaseToken: () => (req: any, _res: any, next: any) => {
                req.user = { id: mock_user_id, role_name: "external_maintainer" };
                next();
            },
        }));

        const reportDAO = new ReportDAO();

        const baseReport = {
            id: 1,
            user_id: 10,
            category_id: 3,
            title: "Title",
            description: "Desc",
            position_lat: 1,
            position_lng: 2,
            created_at: "date",
            updated_at: "date",

            status: ReportStatus.Assigned,
            external_user: mock_user_id,
            reviewed_by: null,
            reviewed_at: null,
            assigned_to: null,
            note: null
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
                status: ReportStatus.Resolved   // ❌ invalid for update
            });

            const res = await request(app)
                .patch("/ext_maintainer/reports/1")
                .send({ status: ReportStatus.InProgress });

            expect(res.status).toBe(403);
        });

        it("should return 403 if report is not assigned to this external maintainer", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue({
                ...baseReport,
                external_user: 999  // ❌ not this user
            });

            const res = await request(app)
                .patch("/ext_maintainer/reports/1")
                .send({ status: ReportStatus.InProgress });

            expect(res.status).toBe(403);
        });

        it("should update the status successfully", async () => {
            vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(baseReport);

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
            const mockComments = [
                {
                    id: 1,
                    report_id: reportId,
                    user_id:11,
                    type: "note",
                    text: "Check the issue",
                    timestamp: new Date().toISOString(),
                },
                {
                    id: 2,
                    report_id: reportId,
                    user_id:12,
                    type: "update",
                    text: "Started fixing",
                    timestamp: new Date().toISOString(),
                },
            ];

            vi.spyOn(CommentDAO.prototype, "getPrivateCommentsByReportId").mockResolvedValue(mockComments);

            const res = await request(app)
                .get(`/report/${reportId}/internal-comments`)
                .set("Authorization", "Bearer fake-token"); // if your verifyFirebaseToken requires headers

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ comments: mockComments });
        });

        it("should return 204 if no comments exist", async () => {
            vi.spyOn(CommentDAO.prototype, "getPrivateCommentsByReportId").mockResolvedValue([]);

            const res = await request(app)
                .get(`/report/${reportId}/internal-comments`)
                .set("Authorization", "Bearer fake-token");

            expect(res.status).toBe(204);
            expect(res.body).toEqual({});
        });

        it("should return 500 if DAO throws an error", async () => {
            vi.spyOn(CommentDAO.prototype, "getPrivateCommentsByReportId").mockRejectedValue(new Error("DB failure"));

            const res = await request(app)
                .get(`/report/${reportId}/internal-comments`)
                .set("Authorization", "Bearer fake-token");

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Internal server error" });
        });
    });

});

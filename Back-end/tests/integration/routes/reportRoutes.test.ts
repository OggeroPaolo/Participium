import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeTestApp } from "../../setup/tests_util.js";
import reportsRouter from "../../../src/routes/reports.routes.js";
import ReportDAO from "../../../src/dao/ReportDAO.js";
import { Report } from "../../../src/models/report.js";
import OperatorDAO from "../../../src/dao/OperatorDAO.js";

// Mock Firebase middleware
vi.mock("../../../src/middlewares/verifyFirebaseToken.js", () => ({
    verifyFirebaseToken: () => (req: any, _res: any, next: any) => {
        req.user = { id: 10, role_name: "pub_relations" }; // simulate authenticated user
        next();
    },
}));

let app: any;

beforeEach(() => {
    vi.clearAllMocks();
    app = makeTestApp(reportsRouter);
});


describe("GET /reports/map", () => {
    it("should return 200 with mapped reports", async () => {
        vi.spyOn(ReportDAO.prototype, "getMapReports").mockResolvedValue([
            {
                id: 1,
                title: "Damaged sidewalk",
                first_name: "John",
                last_name: "Doe",
                position_lat: 45.1,
                position_lng: 9.2,
            },
        ]);

        const res = await request(app).get("/reports/map");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            reports: [
                {
                    id: 1,
                    title: "Damaged sidewalk",
                    reporterName: "John Doe",
                    position: { lat: 45.1, lng: 9.2 },
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

    it("should return 500 if DAO throws an error", async () => {
        vi.spyOn(ReportDAO.prototype, "getMapReports")
            .mockRejectedValue(new Error("DB failure"));

        const res = await request(app).get("/reports/map");

        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: "Internal server error" });
    });
});

describe("PATCH /pub_relations/reports/:reportId", () => {
    const mockReport: Report = {
        id: 1,
        user_id: 2,
        category_id: 3,
        title: "Sample report",
        description: "Description",
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
            10,           // reviewerId from mocked req.user
            null,         // note is null for assigned
            undefined,         // categoryId
            99            // assigneeId
        );
        expect(res.body).toEqual({ message: "Report status updated successfully" });
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
            10,           // reviewerId from mocked req.user
            null,         // note is null for assigned
            12,           // categoryId
            99            // assigneeId
        );
        expect(res.body).toEqual({ message: "Report status updated successfully" });
    });

    it("should set note to null if status is 'rejected' and no note is provided", async () => {
        vi.spyOn(ReportDAO.prototype, "getReportById").mockResolvedValue(mockReport);
        vi.spyOn(OperatorDAO.prototype, "getAssigneeId").mockResolvedValue(99);

        const updateSpy = vi
            .spyOn(ReportDAO.prototype, "updateReportStatusAndAssign")
            .mockResolvedValue({ changes: 1 });

        const res = await request(app)
            .patch("/pub_relations/reports/1")
            .send({ status: "assigned", note: "This note will be ignored" });
        expect(res.status).toBe(200);
        expect(updateSpy).toHaveBeenCalledWith(
            1,         // reportId
            "assigned",// status
            10,        // reviewerId from mocked req.user
            null,      // note should be null 
            undefined, // categoryId not provided
            99  // assigneeId not applicable
        );
        expect(res.body).toEqual({ message: "Report status updated successfully" });
    });

    it("should reject and return 200 when status is 'rejected' and note is provided", async () => {
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
            10,                 // reviewerId from mocked req.user
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



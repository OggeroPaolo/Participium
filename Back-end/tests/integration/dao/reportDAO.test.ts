import { describe, it, expect, vi, beforeEach } from "vitest";
import ReportDao from "../../../src/dao/ReportDAO.js";
import * as db from "../../../src/config/database.js";
import type { Report } from "../../../src/models/report.js";
import { ReportStatus } from "../../../src/models/reportStatus.js";

describe("ReportDao", () => {
    let dao: ReportDao;

    beforeEach(() => {
        dao = new ReportDao();
        vi.clearAllMocks();
    });

    const mockReport: Report = {
        id: 1,
        user_id: 2,
        category_id: 3,
        title: "Sample report",
        description: "Description",
        status: ReportStatus.PendingApproval,
        assigned_to: undefined,
        reviewed_by: undefined,
        reviewed_at: undefined,
        note: undefined,
        position_lat: 40.0,
        position_lng: -70.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    describe("getReportsByFilters", () => {
        it("should return all reports when no filters are applied", async () => {
            const mockRows = [mockReport,
                {
                    id: 2,
                    user_id: 2,
                    category_id: 3,
                    title: "Sample report",
                    description: "Description",
                    status: ReportStatus.Assigned,
                    assigned_to: undefined,
                    reviewed_by: undefined,
                    reviewed_at: undefined,
                    note: undefined,
                    position_lat: 40.0,
                    position_lng: -70.0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }];
            const spy = vi.spyOn(db, "getAll").mockResolvedValue(mockRows);

            const result = await dao.getReportsByFilters({});

            expect(result).toEqual(mockRows);
            expect(spy).toHaveBeenCalledWith(
                "SELECT * FROM reports",
                []
            );
        });

        it("should filter by status", async () => {
            const spy = vi.spyOn(db, "getAll").mockResolvedValue([mockReport]);

            await dao.getReportsByFilters({ status: ReportStatus.PendingApproval });

            expect(spy).toHaveBeenCalledWith(
                "SELECT * FROM reports WHERE status = ?",
                [ReportStatus.PendingApproval]
            );
        });

        it("should filter by officerId", async () => {
            const spy = vi.spyOn(db, "getAll").mockResolvedValue([]);

            await dao.getReportsByFilters({ officerId: 12 });

            expect(spy).toHaveBeenCalledWith(
                "SELECT * FROM reports WHERE assigned_to = ?",
                [12]
            );
        });

        it("should filter by userId", async () => {
            const spy = vi.spyOn(db, "getAll").mockResolvedValue([]);

            await dao.getReportsByFilters({ userId: 50 });

            expect(spy).toHaveBeenCalledWith(
                "SELECT * FROM reports WHERE user_id = ?",
                [50]
            );
        });

        it("should apply multiple filters", async () => {
            const spy = vi.spyOn(db, "getAll").mockResolvedValue([]);

            await dao.getReportsByFilters({
                status: ReportStatus.Assigned,
                officerId: 7,
                userId: 3
            });

            expect(spy).toHaveBeenCalledWith(
                "SELECT * FROM reports WHERE status = ? AND assigned_to = ? AND user_id = ?",
                [ReportStatus.Assigned, 7, 3]
            );
        });
    });
    // ──────────────────────────────────────────────────────────────
    describe("getAcceptedReportsForMap", () => {
        it("should return accepted reports", async () => {
            const mockRows = [
                {
                    id: 1,
                    title: "Report 1",
                    first_name: "John",
                    last_name: "Doe",
                    username: "jdoe",
                    position_lat: 45.0,
                    position_lng: 7.0
                },
                {
                    id: 2,
                    title: "Report 2",
                    first_name: "Jane",
                    last_name: "Smith",
                    username: "jsmith",
                    position_lat: 46.0,
                    position_lng: 8.0
                }
            ];

            const spy = vi.spyOn(db, "getAll").mockResolvedValue(mockRows);

            const result = await dao.getAcceptedReportsForMap();

            expect(result).toEqual(mockRows);
            expect(spy).toHaveBeenCalledWith(
                expect.stringContaining("WHERE r.status != 'pending_approval'")
            );
        });

        it("should return empty array if no accepted reports exist", async () => {
            vi.spyOn(db, "getAll").mockResolvedValue([]);

            const result = await dao.getAcceptedReportsForMap();

            expect(result).toEqual([]);
        });
    });

    // ──────────────────────────────────────────────────────────────
    describe("updateReportExternalMaintainer", () => {
        it("should update report external maintainer successfully", async () => {
            const spy = vi.spyOn(db, "Update").mockResolvedValue({ changes: 1 });

            const result = await dao.updateReportExternalMaintainer(1, 42);

            expect(spy).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE reports"),
                [42, 1]
            );
            expect(result.changes).toBe(1);
        });

        it("should throw error if no changes were made", async () => {
            vi.spyOn(db, "Update").mockResolvedValue({ changes: 0 });

            await expect(
                dao.updateReportExternalMaintainer(999, 42)
            ).rejects.toThrow("Report not found or no changes made");
        });

        it("should propagate database errors", async () => {
            vi.spyOn(db, "Update").mockRejectedValue(new Error("DB failure"));

            await expect(
                dao.updateReportExternalMaintainer(1, 42)
            ).rejects.toThrow("DB failure");
        });
    });

    // ──────────────────────────────────────────────────────────────
    describe("updateReportStatus", () => {
        it("should update report status successfully", async () => {
            const spy = vi.spyOn(db, "Update").mockResolvedValue({ changes: 1 });

            const result = await dao.updateReportStatus(1, "resolved");

            expect(spy).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE reports"),
                ["resolved", 1]
            );
            expect(result.changes).toBe(1);
        });

        it("should throw error if no changes were made", async () => {
            vi.spyOn(db, "Update").mockResolvedValue({ changes: 0 });

            await expect(
                dao.updateReportStatus(999, "resolved")
            ).rejects.toThrow("Report not found or no changes made");
        });

        it("should propagate database errors", async () => {
            vi.spyOn(db, "Update").mockRejectedValue(new Error("DB failure"));

            await expect(
                dao.updateReportStatus(1, "resolved")
            ).rejects.toThrow("DB failure");
        });
    });

    // ──────────────────────────────────────────────────────────────
    describe("updateReportStatusAndAssign", () => {
        it("should update report with all fields", async () => {
            const updateSpy = vi
                .spyOn(db, "Update")
                .mockResolvedValue({ changes: 1 });

            const result = await dao.updateReportStatusAndAssign(1, "resolved", 99, "Reviewed note", 5, 10);

            expect(result.changes).toBe(1);
            expect(updateSpy).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE reports"),
                ["resolved", 99, "Reviewed note", 5, 10, 1]
            );
        });

        it("should retain existing fields if optional parameters are undefined", async () => {
            const updateSpy = vi.spyOn(db, "Update").mockResolvedValue({ changes: 1 });

            await dao.updateReportStatusAndAssign(1, "in_progress", 50);

            expect(updateSpy).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE reports"),
                ["in_progress", 50, undefined, undefined, undefined, 1]
            );
        });

        it("should throw error if no changes made", async () => {
            vi.spyOn(db, "Update").mockResolvedValue({ changes: 0 });

            await expect(
                dao.updateReportStatusAndAssign(999, "resolved", 1)
            ).rejects.toThrow("Report not found or no changes made");
        });
    });

    // ──────────────────────────────────────────────────────────────
    describe("getReportById", () => {
        it("should return a report if found", async () => {
            vi.spyOn(db, "getOne").mockResolvedValue(mockReport);

            const result = await dao.getReportById(1);

            expect(result).toEqual(mockReport);
        });

        it("should return undefined if not found", async () => {
            vi.spyOn(db, "getOne").mockResolvedValue(undefined);

            const result = await dao.getReportById(999);

            expect(result).toBeUndefined();
        });
    });

    describe("getCompleteReportById", () => {
        const baseRow = {
            id: 1,
            title: "Test report",
            description: "Desc",
            status: "open",
            reviewed_at: null,
            note: null,
            is_anonymous: 0,
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

            // external user
            external_user_id: 40,
            external_first_name: "Marco",
            external_last_name: "Neri",
            external_username: "mneri",

            // first photo
            photo_url: "url1.jpg",
            photo_ordering: 1,
        };

        it("should return complete report with photos", async () => {
            const mockRows = [
                baseRow,
                {
                    ...baseRow,
                    photo_url: "url2.jpg",
                    photo_ordering: 2,
                },
            ];

            const spy = vi.spyOn(db, "getAll").mockResolvedValue(mockRows);

            const result = await dao.getCompleteReportById(1);

            expect(spy).toHaveBeenCalledWith(expect.stringContaining("FROM reports r"), [1]);

            // basic fields
            expect(result.id).toBe(1);
            expect(result.title).toBe("Test report");
            expect(result.description).toBe("Desc");

            // user
            expect(result.user).toEqual({
                id: 10,
                complete_name: "Mario Rossi",
                username: "mrossi",
            });

            // category
            expect(result.category).toEqual({
                id: 5,
                name: "Road Issue",
            });

            // assigned_to
            expect(result.assigned_to).toEqual({
                id: 20,
                complete_name: "Luigi Bianchi",
                username: "lbianchi",
            });

            // reviewed_by
            expect(result.reviewed_by).toEqual({
                id: 30,
                complete_name: "Anna Verdi",
                username: "averdi",
            });

            // external_user
            expect(result.external_user).toEqual({
                id: 40,
                complete_name: "Marco Neri",
                username: "mneri",
            });

            // photos
            expect(result.photos).toEqual([
                { url: "url1.jpg", ordering: 1 },
                { url: "url2.jpg", ordering: 2 },
            ]);
        });

        it("should handle assigned_to, reviewed_by and external_user being null", async () => {
            const mockRows = [
                {
                    ...baseRow,
                    assigned_user_id: null,
                    reviewed_user_id: null,
                    external_user_id: null,
                },
            ];

            vi.spyOn(db, "getAll").mockResolvedValue(mockRows);

            const result = await dao.getCompleteReportById(1);

            expect(result.assigned_to).toBeUndefined();
            expect(result.reviewed_by).toBeUndefined();
            expect(result.external_user).toBeUndefined();
        });

        it("should return report without photos if none exist", async () => {
            const mockRows = [
                {
                    ...baseRow,
                    photo_url: null,
                    photo_ordering: null,
                },
            ];

            vi.spyOn(db, "getAll").mockResolvedValue(mockRows);

            const result = await dao.getCompleteReportById(1);

            expect(result.photos).toEqual([]);
        });

        it("should throw if report does not exist", async () => {
            vi.spyOn(db, "getAll").mockResolvedValue([]);
            await expect(dao.getCompleteReportById(123)).rejects.toThrow("Report not found");
        });
    });

    // ──────────────────────────────────────────────────────────────
    describe("createReport", () => {
        const dto = {
            user_id: 10,
            category_id: 5,
            title: "New report",
            description: "A new test report",
            position_lat: 40.0,
            position_lng: 7.0,
            is_anonymous: false,
            photos: ["a.jpg", "b.jpg", "c.jpg"]
        };

        it("should create a report with up to 3 photos and return the complete report", async () => {
            const mockInsertedId = 123;

            const beginSpy = vi.spyOn(db, "beginTransaction").mockResolvedValue(undefined);
            const commitSpy = vi.spyOn(db, "commitTransaction").mockResolvedValue(undefined);

            const updateSpy = vi.spyOn(db, "Update")
                .mockResolvedValueOnce({ changes: 1, lastID: mockInsertedId }) //Report insert
                .mockResolvedValue({ changes: 1 }); //Photos insert

            const mockCompleteReport = { id: mockInsertedId, title: dto.title };
            const getReportSpy = vi
                .spyOn(dao, "getCompleteReportById")
                .mockResolvedValue(mockCompleteReport as any);

            const result = await dao.createReport(dto);

            expect(beginSpy).toHaveBeenCalled();
            expect(commitSpy).toHaveBeenCalled();

            // report insert
            expect(updateSpy).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO reports"),
                [
                    dto.user_id,
                    dto.category_id,
                    dto.title,
                    dto.description,
                    dto.position_lat,
                    dto.position_lng,
                    0
                ]
            );

            // there should be 4 Update calls total: 1 for report + 3 for photos
            expect(updateSpy).toHaveBeenCalledTimes(4);

            expect(updateSpy).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining("INSERT INTO photos"),
                [mockInsertedId, "a.jpg", 1]
            );
            expect(updateSpy).toHaveBeenNthCalledWith(
                3,
                expect.stringContaining("INSERT INTO photos"),
                [mockInsertedId, "b.jpg", 2]
            );
            expect(updateSpy).toHaveBeenNthCalledWith(
                4,
                expect.stringContaining("INSERT INTO photos"),
                [mockInsertedId, "c.jpg", 3]
            );

            expect(getReportSpy).toHaveBeenCalledWith(mockInsertedId);
            expect(result).toEqual(mockCompleteReport);
        });


        it("should insert only up to 3 photos even if more are provided", async () => {
            const dtoWith4Photos = {
                ...dto,
                photos: ["1.jpg", "2.jpg", "3.jpg", "4.jpg"]
            };

            vi.spyOn(db, "beginTransaction").mockResolvedValue(undefined);
            vi.spyOn(db, "commitTransaction").mockResolvedValue(undefined);

            vi.spyOn(db, "Update")
                .mockResolvedValueOnce({ lastID: 99, changes: 1 }) // insert report
                .mockResolvedValue({ changes: 1 }); // photo inserts

            vi.spyOn(dao, "getCompleteReportById").mockResolvedValue({ id: 99 } as any);

            await dao.createReport(dtoWith4Photos);

            const photoCalls = (db.Update as any).mock.calls.filter(
                (c: any) => c[0].includes("INSERT INTO photos")
            );

            expect(photoCalls.length).toBe(3);
        });

        it("should create a report with anonymous set to true", async () => {
            const dto = {
                user_id: 1,
                category_id: 2,
                title: "Test",
                description: "Desc",
                position_lat: 10,
                position_lng: 20,
                is_anonymous: true,
                photos: []
            };

            const updateSpy = vi.spyOn(db, "Update").mockResolvedValue({ changes: 1, lastID: 1 });
            vi.spyOn(dao, "getCompleteReportById").mockResolvedValue({ id: 1 } as any);
            vi.spyOn(db, "beginTransaction").mockResolvedValue(undefined);
            vi.spyOn(db, "commitTransaction").mockResolvedValue(undefined);

            await dao.createReport(dto);

            expect(updateSpy).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO reports"),
                expect.arrayContaining([1])
            );
        });

        it("should rollback and throw if report insert fails", async () => {
            vi.spyOn(db, "beginTransaction").mockResolvedValue(undefined);
            const rollbackSpy = vi.spyOn(db, "rollbackTransaction").mockResolvedValue(undefined);

            // first Update → insert report → fails (no lastID)
            vi.spyOn(db, "Update").mockResolvedValue({ lastID: undefined, changes: 0 });

            await expect(dao.createReport(dto)).rejects.toThrow("Insert report failed");

            expect(rollbackSpy).toHaveBeenCalled();
        });

        it("should rollback on any thrown error", async () => {
            vi.spyOn(db, "beginTransaction").mockResolvedValue(undefined);
            const rollbackSpy = vi.spyOn(db, "rollbackTransaction").mockResolvedValue(undefined);

            // first insert is OK
            vi.spyOn(db, "Update")
                .mockResolvedValueOnce({ lastID: 10, changes: 1 }) // insert report
                .mockRejectedValueOnce(new Error("DB crash")); // inserting photo fails

            await expect(dao.createReport(dto)).rejects.toThrow("DB crash");

            expect(rollbackSpy).toHaveBeenCalled();
        });
    });

});

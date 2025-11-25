import { describe, it, expect, vi, beforeEach } from "vitest";
import ReportDao from "../../../src/dao/ReportDAO.js";
import * as db from "../../../src/config/database.js";
import type { Report } from "../../../src/models/report.js";
import { ReportWithPhotosDTO } from "../../../src/dto/ReportWithPhotosDTO.js";

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
        status: "pending_approval",
        assigned_to: undefined,
        reviewed_by: undefined,
        reviewed_at: undefined,
        note: undefined,
        position_lat: 40.0,
        position_lng: -70.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

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

    describe("getReportWithPhotos", () => {
        it("should return a report with ordered photos", async () => {
            const rows = [
                {
                    ...mockReport,
                    photo_url: "https://example.com/0.jpg",
                    ordering: 1
                },
                {
                    ...mockReport,
                    photo_url: "https://example.com/1.jpg",
                    ordering: 2
                }
            ];

            vi.spyOn(db, "getAll").mockResolvedValue(rows);

            const result = await dao.getReportWithPhotos(mockReport.id);

            expect(result.id).toBe(mockReport.id);
            expect(result.photos).toEqual([
                { url: "https://example.com/0.jpg", ordering: 1 },
                { url: "https://example.com/1.jpg", ordering: 2 }
            ]);
        });

        it("should return report with empty photos array if no photos exist", async () => {
            const rows = [
                {
                    ...mockReport,
                    photo_url: null,
                    ordering: null
                }
            ];

            vi.spyOn(db, "getAll").mockResolvedValue(rows);

            const result = await dao.getReportWithPhotos(mockReport.id);

            expect(result.photos).toEqual([]);
        });

        it("should throw if report not found", async () => {
            vi.spyOn(db, "getAll").mockResolvedValue([]);

            await expect(dao.getReportWithPhotos(999))
                .rejects
                .toThrow("Report not found");
        });
    });
    describe("createReport", () => {

        const mockCreateData = {
            user_id: 2,
            category_id: 3,
            title: "New report",
            description: "Created via test",
            position_lat: 40,
            position_lng: -70,
            is_anonymous: false,
            photos: [
                "https://photo1.jpg",
                "https://photo2.jpg",
                "https://photo3.jpg",
                "https://photo4.jpg" // exceeds max 3
            ]
        };

        it("should create report, insert up to 3 photos, commit, and return created report", async () => {
            // Mock transaction
            const begin = vi.spyOn(db, "beginTransaction").mockResolvedValue();
            const commit = vi.spyOn(db, "commitTransaction").mockResolvedValue();

            // Mock report insert result
            const updateSpy = vi.spyOn(db, "Update")
                .mockResolvedValueOnce({ lastID: 10, changes: 1 }) // insert report success
                .mockResolvedValue({ changes: 1 }); // insert photos

            // Mock final fetch
            const mockReturnReport: ReportWithPhotosDTO = {
                ...mockReport,
                id: 10,
                is_anonymous: false,
                assigned_to: undefined, 
                reviewed_by: undefined, 
                reviewed_at: undefined,  
                note: undefined,
                photos: [
                    { url: "https://photo1.jpg", ordering: 1 },
                    { url: "https://photo2.jpg", ordering: 2 },
                    { url: "https://photo3.jpg", ordering: 3 }
                ]
            };



            vi.spyOn(dao, "getReportWithPhotos")
                .mockResolvedValue(mockReturnReport);

            const result = await dao.createReport(mockCreateData);

            expect(begin).toHaveBeenCalled();
            expect(commit).toHaveBeenCalled();

            // Ensure only 3 photos inserted
            expect(updateSpy).toHaveBeenCalledTimes(1 + 3);

            // First Update = insert report
            expect(updateSpy.mock.calls[0][0])
                .toContain("INSERT INTO reports");

            // Next calls = photos
            expect(updateSpy.mock.calls[1][0])
                .toContain("INSERT INTO photos");

            expect(result).toEqual(mockReturnReport);
        });

        it("should rollback transaction if an error occurs", async () => {
            vi.spyOn(db, "beginTransaction").mockResolvedValue();
            vi.spyOn(db, "rollbackTransaction").mockResolvedValue();

            // Fail on first Update
            vi.spyOn(db, "Update").mockRejectedValue(new Error("DB failure"));

            await expect(dao.createReport(mockCreateData))
                .rejects
                .toThrow("DB failure");

            expect(db.rollbackTransaction).toHaveBeenCalled();
        });
    });


});

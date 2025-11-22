import { describe, it, expect, vi, beforeEach } from "vitest";
import ReportDao, { ReportNotFoundError } from "../../../src/dao/ReportDao.js";
import * as db from "../../../src/config/database.js";
import type { Report } from "../../../src/models/report.js";

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
        assigned_to: null,
        reviewed_by: null,
        reviewed_at: null,
        note: "Initial note",
        position_lat: 40.0,
        position_lng: -70.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    describe("updateReportStatusAndAssign", () => {
        it("should update report with all fields", async () => {
            const updateSpy = vi
                .spyOn(db, "Update")
                .mockResolvedValue({ changes: 1 });

            const result = await dao.updateReportStatusAndAssign(1, "resolved", 99, "Reviewed note", 5, 10);

            expect(result.changes).toBe(1);
            expect(updateSpy).toHaveBeenCalledWith(expect.stringContaining("UPDATE reports"), ["resolved", 99, "Reviewed note", 5, 10, 1]);
        });

        it("should retain existing fields if optional parameters are undefined (COALESCE)", async () => {
            const updateSpy = vi.spyOn(db, "Update").mockResolvedValue({ changes: 1 });

            //No optional params provided
            await dao.updateReportStatusAndAssign(1, "in_progress", 50);

            expect(updateSpy).toHaveBeenCalledWith(expect.stringContaining("UPDATE reports"), ["in_progress", 50, undefined, undefined, undefined, 1]);
        });

        it("should throw error if no changes made", async () => {
            vi.spyOn(db, "Update").mockResolvedValue({ changes: 0 });

            await expect(dao.updateReportStatusAndAssign(999, "resolved", 1)).rejects.toThrow("Report not found or no changes made");
        });
    });

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
});

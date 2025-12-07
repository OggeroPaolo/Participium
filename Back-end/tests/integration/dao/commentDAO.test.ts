import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import CommentDAO from "../../../src/dao/CommentDAO.js";
import * as db from "../../../src/config/database.js";
import type { Comment } from "../../../src/models/comment.js";

describe("CommentDAO Unit Test Suite", () => {
  let dao: CommentDAO;

  beforeEach(() => {
    dao = new CommentDAO();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------
  // getPrivateCommentsByReportId
  // ------------------------------
  describe("getPrivateCommentsByReportId", () => {
    const reportId = 42;

    it("returns all private comments for a report", async () => {
      const mockComments: Comment[] = [
        { id: 1, report_id: reportId, user_id: 1, type: "private", text: "Private comment 1", timestamp: "2025-12-05T10:00:00Z" },
        { id: 2, report_id: reportId, user_id: 2, type: "private", text: "Private comment 2", timestamp: "2025-12-05T10:05:00Z" },
      ];

      const getAllMock = vi.spyOn(db, "getAll").mockResolvedValueOnce(mockComments);

      const result = await dao.getPrivateCommentsByReportId(reportId);

      expect(result).toEqual(mockComments);
      expect(getAllMock).toHaveBeenCalledTimes(1);
      expect(getAllMock).toHaveBeenCalledWith(
        `
            SELECT *
            FROM comments
            WHERE report_id = ? AND type = 'private'
        `,
        [reportId]
      );
    });

    it("returns empty array if no private comments found", async () => {
      vi.spyOn(db, "getAll").mockResolvedValueOnce([]);

      const result = await dao.getPrivateCommentsByReportId(reportId);

      expect(result).toEqual([]);
    });

    it("throws error if getAll fails", async () => {
      const error = new Error("DB Error");
      vi.spyOn(db, "getAll").mockRejectedValueOnce(error);

      await expect(dao.getPrivateCommentsByReportId(reportId)).rejects.toThrow("DB Error");
    });
  });
});

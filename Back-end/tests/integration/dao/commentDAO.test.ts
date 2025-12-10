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

  // ------------------------------
  // getCommentById
  // ------------------------------
  describe("getCommentById", () => {
    const commentId = 10;

    it("returns the comment when found", async () => {
      const mockComment: Comment = {
        id: commentId,
        report_id: 1,
        user_id: 2,
        type: "private",
        text: "Test comment",
        timestamp: "2025-12-05T10:00:00Z",
      };

      const getOneMock = vi.spyOn(db, "getOne").mockResolvedValueOnce(mockComment);

      const result = await dao.getCommentById(commentId);

      expect(result).toEqual(mockComment);
      expect(getOneMock).toHaveBeenCalledTimes(1);
      expect(getOneMock).toHaveBeenCalledWith(
        `
            SELECT *
            FROM comments
            WHERE id = ?
        `,
        [commentId]
      );
    });

    it("returns undefined if no comment found", async () => {
      vi.spyOn(db, "getOne").mockResolvedValueOnce(undefined);

      const result = await dao.getCommentById(commentId);

      expect(result).toBeUndefined();
    });

    it("throws error if getOne fails", async () => {
      const error = new Error("DB Error");
      vi.spyOn(db, "getOne").mockRejectedValueOnce(error);

      await expect(dao.getCommentById(commentId)).rejects.toThrow("DB Error");
    });
  });


  // ------------------------------
  // createComment
  // ------------------------------
  describe("createComment", () => {
    const createData = {
      report_id: 5,
      user_id: 3,
      type: "private",
      text: "New comment",
    };

    it("creates a new comment and returns it", async () => {
      const insertedID = 99;

      const updateMock = vi.spyOn(db, "Update").mockResolvedValueOnce({ changes:1, lastID: insertedID });

      const mockComment: Comment = {
        id: insertedID,
        report_id: createData.report_id,
        user_id: createData.user_id,
        type: createData.type,
        text: createData.text,
        timestamp: "2025-12-05T12:00:00Z",
      };

      const getCommentMock = vi
        .spyOn(dao, "getCommentById")
        .mockResolvedValueOnce(mockComment);

      const result = await dao.createComment(createData);

      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(updateMock).toHaveBeenCalledWith(
        `
            INSERT INTO comments (
                report_id, user_id, type, text, timestamp
            ) VALUES (
             ?, ?, ?, ?, CURRENT_TIMESTAMP
            )
        `,
        [createData.report_id, createData.user_id, createData.type, createData.text]
      );

      expect(getCommentMock).toHaveBeenCalledTimes(1);
      expect(getCommentMock).toHaveBeenCalledWith(insertedID);
      expect(result).toEqual(mockComment);
    });

    it("throws if creation fails (no lastID)", async () => {
      vi.spyOn(db, "Update").mockResolvedValueOnce({ changes:0 });

      await expect(dao.createComment(createData)).rejects.toThrow("Comment creation failed");
    });

    it("throws if comment is created but cannot be retrieved", async () => {


      vi.spyOn(db, "Update").mockResolvedValueOnce({ changes: 1, lastID: 100});
      vi.spyOn(dao, "getCommentById").mockResolvedValueOnce(undefined);

      await expect(dao.createComment(createData)).rejects.toThrow(
        "Comment created but issue with retrieving it"
      );
    });

    it("throws if Update fails", async () => {
      const error = new Error("DB Error");
      vi.spyOn(db, "Update").mockRejectedValueOnce(error);

      await expect(dao.createComment(createData)).rejects.toThrow("DB Error");
    });
  });

});

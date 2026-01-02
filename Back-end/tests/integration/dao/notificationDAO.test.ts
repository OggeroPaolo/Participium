import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import NotificationDAO from "../../../src/dao/NotificationDAO.js";
import * as db from "../../../src/config/database.js";
import type { Notification } from "../../../src/models/notification.js";
import type { NotificationWithRelationsDTO } from "../../../src/dto/NotificationDTO.js";

describe("NotificationDAO Unit Test Suite", () => {
    let dao: NotificationDAO;

    beforeEach(() => {
        dao = new NotificationDAO();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ------------------------------
    // createNotification
    // ------------------------------
    describe("createNotification", () => {
        const createData = {
            user_id: 1,
            type: 'comment_on_created_report',
            report_id: 10,
            comment_id: 5,
            title: "New comment",
            message: "A comment was added",
        };

        it("creates a notification and returns it", async () => {
            const insertedID = 99;

            vi.spyOn(db, "Update").mockResolvedValueOnce({
                changes: 1,
                lastID: insertedID,
            });

            const mockNotification: Notification = {
                id: insertedID,
                user_id: createData.user_id,
                type: 'comment_on_created_report',
                report_id: createData.report_id,
                comment_id: createData.comment_id,
                title: createData.title,
                message: createData.message,
                is_read: 0,
                created_at: new Date().toISOString(),
            };

            vi.spyOn(dao, "getNotificationById").mockResolvedValueOnce(mockNotification);

            const result = await dao.createNotification(createData);

            expect(db.Update).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockNotification);
        });

        it("throws if creation fails (no lastID)", async () => {
            vi.spyOn(db, "Update").mockResolvedValueOnce({ changes: 0 });

            await expect(dao.createNotification(createData)).rejects.toThrow(
                "Notification creation failed"
            );
        });

        it("throws if notification is created but cannot be retrieved", async () => {
            vi.spyOn(db, "Update").mockResolvedValueOnce({
                changes: 1,
                lastID: 100,
            });

            vi.spyOn(dao, "getNotificationById").mockResolvedValueOnce(undefined);

            await expect(dao.createNotification(createData)).rejects.toThrow(
                "Notification created but issue with retrieving it"
            );
        });

        it("throws if Update fails", async () => {
            vi.spyOn(db, "Update").mockRejectedValueOnce(new Error("DB Error"));

            await expect(dao.createNotification(createData)).rejects.toThrow("DB Error");
        });
    });

    // ------------------------------
    // getNotificationById
    // ------------------------------
    describe("getNotificationById", () => {
        const notificationId = 5;

        it("returns notification when found", async () => {
            const mockNotification: Notification = {
                id: notificationId,
                user_id: 1,
                type: 'comment_on_created_report',
                report_id: 10,
                comment_id: null,
                title: "Test",
                message: null,
                is_read: 0,
                created_at: new Date().toISOString(),
            };

            vi.spyOn(db, "getOne").mockResolvedValueOnce(mockNotification);

            const result = await dao.getNotificationById(notificationId);

            expect(result).toEqual(mockNotification);
            expect(db.getOne).toHaveBeenCalledWith(expect.any(String), [notificationId]);
        });

        it("returns undefined if notification not found", async () => {
            vi.spyOn(db, "getOne").mockResolvedValueOnce(undefined);

            const result = await dao.getNotificationById(notificationId);

            expect(result).toBeUndefined();
        });

        it("throws if getOne fails", async () => {
            vi.spyOn(db, "getOne").mockRejectedValueOnce(new Error("DB Error"));

            await expect(dao.getNotificationById(notificationId)).rejects.toThrow(
                "DB Error"
            );
        });
    });

    // ------------------------------
    // getNotificationsByUserId
    // ------------------------------
    describe("getNotificationsByUserId", () => {
        const userId = 1;

        it("returns notifications with relations", async () => {
            const dbRows = [
                {
                    id: 1,
                    user_id: userId,
                    type: "COMMENT",
                    report_id: 10,
                    comment_id: 5,
                    title: "New comment",
                    message: "A comment was added",
                    is_read: 0,
                    created_at: "2025-01-01",
                    report_id_full: 10,
                    report_title: "Broken road",
                    report_status: "OPEN",
                    comment_id_full: 5,
                    comment_text: "Fix this",
                    comment_timestamp: "2025-01-01",
                    comment_username: "john",
                    comment_first_name: "John",
                    comment_last_name: "Doe",
                },
            ];

            vi.spyOn(db, "getAll").mockResolvedValueOnce(dbRows);

            const result = await dao.getNotificationsByUserId(userId);

            const expected: NotificationWithRelationsDTO[] = [
                {
                    id: 1,
                    user_id: userId,
                    type: "COMMENT",
                    report_id: 10,
                    comment_id: 5,
                    title: "New comment",
                    message: "A comment was added",
                    is_read: 0,
                    created_at: "2025-01-01",
                    report: {
                        id: 10,
                        title: "Broken road",
                        status: "OPEN",
                    },
                    comment: {
                        id: 5,
                        text: "Fix this",
                        timestamp: "2025-01-01",
                        user: {
                            username: "john",
                            first_name: "John",
                            last_name: "Doe",
                        },
                    },
                },
            ];

            expect(result).toEqual(expected);
        });

        it("returns empty array if no notifications", async () => {
            vi.spyOn(db, "getAll").mockResolvedValueOnce([]);

            const result = await dao.getNotificationsByUserId(userId);

            expect(result).toEqual([]);
        });

        it("throws if getAll fails", async () => {
            vi.spyOn(db, "getAll").mockRejectedValueOnce(new Error("DB Error"));

            await expect(dao.getNotificationsByUserId(userId)).rejects.toThrow(
                "DB Error"
            );
        });
    });

    // ------------------------------
    // markAsRead
    // ------------------------------
    describe("markAsRead", () => {
        it("marks notification as read", async () => {
            vi.spyOn(db, "Update").mockResolvedValueOnce({ changes: 1 });

            await expect(dao.markAsRead(1, 1)).resolves.toBeUndefined();
        });

        it("throws if notification not found or user mismatch", async () => {
            vi.spyOn(db, "Update").mockResolvedValueOnce({ changes: 0 });

            await expect(dao.markAsRead(1, 1)).rejects.toThrow(
                "Notification not found or user mismatch"
            );
        });
    });

    // ------------------------------
    // markAllAsRead
    // ------------------------------
    describe("markAllAsRead", () => {
        it("marks all notifications as read", async () => {
            vi.spyOn(db, "Update").mockResolvedValueOnce({ changes: 3 });

            await expect(dao.markAllAsRead(1)).resolves.toBeUndefined();
        });
    });

    // ------------------------------
    // getUnreadCount
    // ------------------------------
    describe("getUnreadCount", () => {
        it("returns unread count", async () => {
            vi.spyOn(db, "getOne").mockResolvedValueOnce({ count: 4 });

            const result = await dao.getUnreadCount(1);

            expect(result).toBe(4);
        });

        it("returns 0 if no unread notifications", async () => {
            vi.spyOn(db, "getOne").mockResolvedValueOnce(undefined);

            const result = await dao.getUnreadCount(1);

            expect(result).toBe(0);
        });
    });
});

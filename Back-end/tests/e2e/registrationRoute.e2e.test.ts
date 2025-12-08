import request from "supertest";
import { Express } from "express";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import userRouter from "../../src/routes/registrations.routes.js";
import { makeTestApp, initTestDB, resetTestDB } from "../setup/tests_util.js";
import UserDAO from "../../src/dao/UserDAO.js";

import * as pendingSvc from "../../src/services/pendingUsersService.js";
import * as emailSvc from "../../src/services/emailService.js";

describe("POST /user-registrations", () => {
    let app: Express;
    let dao: UserDAO;

    beforeEach(async () => {
        await initTestDB();
        app = makeTestApp(userRouter);
        dao = new UserDAO();

        vi.restoreAllMocks();
    });

    afterEach(async () => {
        await resetTestDB();
    });
    describe("POST /user-registrations", () => {
        it("should store pending user and send verification email", async () => {
            // Mock email sending
            vi.spyOn(emailSvc, "sendVerificationEmail").mockResolvedValue();

            const saveSpy = vi.spyOn(pendingSvc, "savePendingUser");

            const res = await request(app)
                .post("/user-registrations")
                .send({
                    firstName: "John",
                    lastName: "Doe",
                    username: "johndoe",
                    email: "john@example.com",
                    password: "password123",
                });

            expect(res.status).toBe(200);
            console.log(res.body);

        });
    });
});
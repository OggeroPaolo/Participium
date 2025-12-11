import request from "supertest";
import { Express } from "express";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import userRouter from "../../src/routes/registrations.routes.js";
import { makeTestApp, initTestDB, resetTestDB } from "../setup/tests_util.js";
import UserDAO from "../../src/dao/UserDAO.js";

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
        it("should return 400 for invalid input (validation errors)", async () => {
            const res = await request(app)
                .post("/user-registrations")
                .send({
                    firstName: "",     // invalid
                    lastName: "",      // invalid
                    username: "??",    // invalid: not alphanumeric
                    email: "not-email",// invalid
                    password: 123      // invalid: not string
                });

            expect(res.status).toBe(400);
            expect(res.body.errors).toBeInstanceOf(Array);
            expect(res.body.errors.length).toBeGreaterThan(0);
        });


        it("should return 422 when email or username already exists", async () => {

            const res = await request(app)
                .post("/user-registrations")
                .send({
                    firstName: "John",
                    lastName: "Doe",
                    username: "johndoe",
                    email: "citizen@example.com",
                    password: "password123"
                });

            expect(res.status).toBe(422);
            expect(res.body.error).toBe("Email or username already in use");
        });


        it("should return 422 when a pending user already exists for this email", async () => {

            // First, create a pending user
            await request(app)
                .post("/user-registrations")
                .send({
                    firstName: "John",
                    lastName: "Doe",
                    username: "johndoe",
                    email: "pending@example.com",
                    password: "password123"
                });

            const res = await request(app)
                .post("/user-registrations")
                .send({
                    firstName: "John",
                    lastName: "Doe",
                    username: "johndoe",
                    email: "pending@example.com",
                    password: "password123"
                });

            expect(res.status).toBe(422);
            expect(res.body.error).toContain("already pending");
        });


        it("should return 500 on unexpected server error", async () => {
            // Force the DAO to explode
            vi.spyOn(UserDAO.prototype, "findUserByEmailOrUsername")
                .mockRejectedValue(new Error("Database failure"));

            const res = await request(app)
                .post("/user-registrations")
                .send({
                    firstName: "John",
                    lastName: "Doe",
                    username: "johndoe",
                    email: "fail@example.com",
                    password: "password123"
                });

            expect(res.status).toBe(500);
            expect(res.body.error).toBe("Internal server error");
        });
    });
});
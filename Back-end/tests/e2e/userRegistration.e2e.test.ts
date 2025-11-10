import request from "supertest";
import { Express } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userRouter from "../../src/routes/registrations.routes"; 
import * as userService from "../../src/services/userService";
import UserDAO from "../../src/dao/UserDAO";
import { makeTestApp } from "../utils/testApp";

describe("POST /user-registrations (E2E)", () => {
    let app: Express;

    beforeEach(() => {
        vi.clearAllMocks();
        app = makeTestApp(userRouter);
    });

    it("should create a new user successfully", async () => {
        // Mock createUserWithFirebase and DAO
        const mockUser = {
            id: "12345",
            firebase_uid: "firebase123",
            email: "john@example.com",
            username: "johndoe",
            first_name: "John",
            last_name: "Doe",
        } as any;

        const createUserMock = vi
            .spyOn(userService, "createUserWithFirebase")
            .mockResolvedValue(mockUser);

        const response = await request(app)
            .post("/user-registrations")
            .send({
                firstName: "John",
                lastName: "Doe",
                username: "johndoe",
                email: "john@example.com",
                password: "password123",
            });

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
            message: "User data saved successfully",
            userId: "12345",
        });

        expect(createUserMock).toHaveBeenCalledWith(
            {
                firstName: "John",
                lastName: "Doe",
                username: "johndoe",
                email: "john@example.com",
                password: "password123",
            },
            expect.any(UserDAO)
        );

        createUserMock.mockRestore();
    });

    it("should return 400 for invalid input (empty field)", async () => {
        const response = await request(app)
            .post("/user-registrations")
            .send({
                firstName: "",
                lastName: "Doe",
                username: "jd",
                email: "invalidemail",
                password: "",
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("error", "Invalid request data");
    });

    it("should return 422 if username or email conflicts", async () => {
        vi.spyOn(userService, "createUserWithFirebase").mockRejectedValue(
            new userService.EmailOrUsernameConflictError("Username or email already taken")
        );

        const response = await request(app)
            .post("/user-registrations")
            .send({
                firstName: "Alice",
                lastName: "Smith",
                username: "alicesmith",
                email: "alice@example.com",
                password: "password123",
            });

        expect(response.status).toBe(422);
        expect(response.body).toEqual({ error: "Username or email already taken" });
    });

    it("should return 409 if user already exists", async () => {
        vi.spyOn(userService, "createUserWithFirebase").mockRejectedValue(
            new userService.UserAlreadyExistsError("User already exists in Firebase")
        );

        const response = await request(app)
            .post("/user-registrations")
            .send({
                firstName: "Bob",
                lastName: "Jones",
                username: "bobjones",
                email: "bob@example.com",
                password: "password123",
            });

        expect(response.status).toBe(409);
        expect(response.body).toEqual({ error: "User already exists in Firebase" });
    });

    it("should return 500 for unexpected errors", async () => {
        vi.spyOn(userService, "createUserWithFirebase").mockRejectedValue(
            new Error("Unexpected error")
        );

        const response = await request(app)
            .post("/user-registrations")
            .send({
                firstName: "Eve",
                lastName: "Brown",
                username: "evebrown",
                email: "eve@example.com",
                password: "password123",
            });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: "Internal server error" });
    });
});

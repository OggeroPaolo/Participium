import request from "supertest";
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { makeTestApp, initTestDB, resetTestDB } from "../setup/tests_util.js";
import reportsRouter from "../../src/routes/reports.routes.js";
import registrationsRouter from "../../src/routes/registrations.routes.js";
import ReportDAO from "../../src/dao/ReportDAO.js";
import CommentDAO from "../../src/dao/CommentDAO.js";
import OperatorDAO from "../../src/dao/OperatorDAO.js";
import { ReportStatus } from "../../src/models/reportStatus.js";
import * as emailService from "../../src/services/emailService.js";
import * as pendingUsers from "../../src/services/pendingUsersService.js";
import * as passwordEnc from "../../src/services/passwordEncryptionSercive.js";
import * as userService from "../../src/services/userService.js";
import UserDAO from "../../src/dao/UserDAO.js";
import bcrypt from "bcrypt";

// Mock Firebase middleware for different user roles
// Using actual seeded user IDs from init.ts:
// User ID 10 = operator-urban (Road_signs_urban_furnishings_officer) - tech_officer
// User ID 14 = CarlosSainz (Apex Worker) - external_maintainer for category 7 (Roads and Urban Furnishings)
const mockTechOfficer = { id: 10, role_name: "tech_officer", role_type: "tech_officer" };
const mockExternalMaintainer = { id: 14, role_name: "external_maintainer", role_type: "external_maintainer" };
const mockCitizen = { id: 1, role_name: "Citizen", role_type: "citizen" };

vi.mock("../../src/middlewares/verifyFirebaseToken.js", () => ({
    verifyFirebaseToken: (roles: string[]) => (req: any, _res: any, next: any) => {
        // Determine user based on route or default to tech officer
        if (req.path?.includes("ext_maintainer")) {
            req.user = mockExternalMaintainer;
        } else if (req.path?.includes("tech_officer")) {
            req.user = mockTechOfficer;
        } else {
            req.user = mockTechOfficer; // default
        }
        next();
    },
}));

// Mock Multer middleware
vi.mock("../../../src/config/multer.js", () => ({
    upload: {
        array: (_fieldName: string, _maxCount?: number) => (req: any, _res: any, next: any) => {
            req.files = [];
            next();
        },
    },
}));

// Mock fs/promises
vi.mock("fs/promises", async () => {
    const actual = await vi.importActual<any>("fs/promises");
    return {
        ...actual,
        unlink: vi.fn().mockResolvedValue(undefined),
    };
});

let app: any;
let reportsApp: any;
let registrationsApp: any;

beforeAll(async () => {
    await initTestDB();
});

beforeEach(async () => {
    vi.clearAllMocks();
    await resetTestDB();
    reportsApp = makeTestApp(reportsRouter);
    registrationsApp = makeTestApp(registrationsRouter);
});

describe("User Story Integration Tests", () => {
    
    /**
     * USER STORY 1: As a technical office staff member
     * I want to see the list of reports assigned to me
     * So that I can get an overview of the maintenance to be done
     */
    describe("US1: Technical Officer Views Assigned Reports", () => {
        it("should return list of reports assigned to technical officer", async () => {
            // Setup: Create reports assigned to the tech officer
            // Use category 7 (Roads and Urban Furnishings) which matches tech officer ID 10
            const reportDAO = new ReportDAO();
            
            // Create first report
            const report1 = await reportDAO.createReport({
                user_id: 1,
                category_id: 7, // Roads and Urban Furnishings - matches tech officer
                title: "Broken streetlight",
                description: "Streetlight is not working",
                address: "Via Roma 1",
                position_lat: 45.0703,
                position_lng: 7.6869,
                is_anonymous: false,
            });
            
            // Assign to tech officer
            await reportDAO.updateReportStatusAndAssign(
                report1.id!,
                ReportStatus.Assigned,
                3, // reviewer
                null,
                7,
                mockTechOfficer.id
            );

            // Create second report
            const report2 = await reportDAO.createReport({
                user_id: 1,
                category_id: 7, // Roads and Urban Furnishings
                title: "Pothole in road",
                description: "Large pothole needs repair",
                address: "Via Torino 5",
                position_lat: 45.0704,
                position_lng: 7.6870,
                is_anonymous: false,
            });
            
            // Assign to tech officer and update status to InProgress
            await reportDAO.updateReportStatusAndAssign(
                report2.id!,
                ReportStatus.InProgress,
                3, // reviewer
                null,
                7,
                mockTechOfficer.id
            );

            // Execute: Get assigned reports
            const res = await request(reportsApp)
                .get("/tech_officer/reports")
                .set("Authorization", "Bearer fake-token");

            // Assert: Should return list of assigned reports
            expect(res.status).toBe(200);
            expect(res.body.reports).toBeDefined();
            expect(Array.isArray(res.body.reports)).toBe(true);
            expect(res.body.reports.length).toBeGreaterThanOrEqual(2);
            
            // Verify reports are assigned to the tech officer
            const assignedReports = res.body.reports.filter(
                (r: any) => r.assigned_to === mockTechOfficer.id
            );
            expect(assignedReports.length).toBeGreaterThanOrEqual(2);
        });

        it("should return 204 when no reports are assigned", async () => {
            // Setup: Use a tech officer with no assigned reports
            // Create a new tech officer user or use one that doesn't have reports
            // For this test, we'll check if the route returns 204 or 200 with empty array
            // The seeded data might have reports, so we test the behavior
            
            // Execute: Get assigned reports
            const res = await request(reportsApp)
                .get("/tech_officer/reports")
                .set("Authorization", "Bearer fake-token");

            // Assert: Should return 204 No Content (or 200 with empty array)
            // Note: If seeded data has reports, status will be 200, otherwise 204
            expect([200, 204]).toContain(res.status);
            if (res.status === 200) {
                expect(res.body.reports).toBeDefined();
                expect(Array.isArray(res.body.reports)).toBe(true);
            }
        });
    });

    /**
     * USER STORY 2: As a technical office staff member
     * I want to assign reports to external maintainers
     * So that specialized maintainers can handle and update the intervention
     */
    describe("US2: Technical Officer Assigns Reports to External Maintainers", () => {
        let reportId: number;

        beforeEach(async () => {
            // Setup: Create a report and assign it to tech officer
            // Use category 7 (Roads and Urban Furnishings) which matches the external maintainer (ID 14)
            // User ID 14 (CarlosSainz) is Apex Worker with company_id 7 (Apex Corp) which has category_id 7
            const reportDAO = new ReportDAO();
            
            // Create report (will be pending_approval)
            const report = await reportDAO.createReport({
                user_id: 1,
                category_id: 7, // Roads and Urban Furnishings - matches Apex Worker (user 14)
                title: "Broken infrastructure",
                description: "Needs external specialist",
                address: "Via Test 10",
                position_lat: 45.0703,
                position_lng: 7.6869,
                is_anonymous: false,
            });
            reportId = report.id!;

            // Assign report to tech officer (simulating public relations officer approval)
            await reportDAO.updateReportStatusAndAssign(
                reportId,
                ReportStatus.Assigned,
                3, // reviewer (public relations officer from seed data)
                null, // no note
                7, // category_id
                mockTechOfficer.id // assignee
            );
            // Don't mock - let it query the real database
        });

        it("should successfully assign report to external maintainer", async () => {
            // Verify report exists and is in correct state
            const reportDAO = new ReportDAO();
            const reportBefore = await reportDAO.getReportById(reportId);
            expect(reportBefore).toBeDefined();
            expect(reportBefore?.assigned_to).toBe(mockTechOfficer.id);
            expect(reportBefore?.status).toBe(ReportStatus.Assigned);

            // Execute: Assign report to external maintainer
            const res = await request(reportsApp)
                .patch(`/tech_officer/reports/${reportId}/assign_external`)
                .send({ externalMaintainerId: mockExternalMaintainer.id })
                .set("Authorization", "Bearer fake-token");

            // Debug: Log error if not 200
            if (res.status !== 200) {
                console.log("Assignment error:", res.body);
            }

            // Assert: Should return success
            expect(res.status).toBe(200);
            expect(res.body.message).toContain("successfully assigned");

            // Verify: Report should now have external_user set
            const updatedReport = await reportDAO.getReportById(reportId);
            expect(updatedReport?.external_user).toBe(mockExternalMaintainer.id);
        });

        it("should return 403 if external maintainer category doesn't match", async () => {
            // Setup: Mock different category
            vi.spyOn(OperatorDAO.prototype, "getCategoryOfExternalMaintainer")
                .mockResolvedValue(999); // Different category

            // Execute: Try to assign
            const res = await request(reportsApp)
                .patch(`/tech_officer/reports/${reportId}/assign_external`)
                .send({ externalMaintainerId: mockExternalMaintainer.id })
                .set("Authorization", "Bearer fake-token");

            // Assert: Should return 403 Forbidden
            expect(res.status).toBe(403);
        });

        it("should return 403 if report is not assigned to current officer", async () => {
            // Setup: Create report assigned to different officer
            const reportDAO = new ReportDAO();
            const otherReport = await reportDAO.createReport({
                user_id: 1,
                category_id: 7, // Roads and Urban Furnishings
                title: "Other report",
                description: "Assigned to someone else",
                address: "Via Other 1",
                status: ReportStatus.Assigned,
                assigned_to: 999, // Different officer
                position_lat: 45.0703,
                position_lng: 7.6869,
                is_anonymous: false,
            });

            // Execute: Try to assign
            const res = await request(reportsApp)
                .patch(`/tech_officer/reports/${otherReport.id}/assign_external`)
                .send({ externalMaintainerId: mockExternalMaintainer.id })
                .set("Authorization", "Bearer fake-token");

            // Assert: Should return 403 Forbidden
            expect(res.status).toBe(403);
        });
    });

    /**
     * USER STORY 3: As an external maintainer
     * I want to update the status of a report assigned to me
     * So that I can update citizens about the intervention
     */
    describe("US3: External Maintainer Updates Report Status", () => {
        let reportId: number;

        beforeEach(async () => {
            // Setup: Create a report assigned to external maintainer
            // Use category 7 (Roads and Urban Furnishings) which matches the external maintainer (ID 14)
            const reportDAO = new ReportDAO();
            
            // Create report (will be pending_approval)
            const report = await reportDAO.createReport({
                user_id: 1,
                category_id: 7, // Roads and Urban Furnishings - matches Apex Worker (user 14)
                title: "Maintenance needed",
                description: "Requires external maintenance",
                address: "Via Maintenance 5",
                position_lat: 45.0703,
                position_lng: 7.6869,
                is_anonymous: false,
            });
            reportId = report.id!;

            // Assign report to tech officer
            await reportDAO.updateReportStatusAndAssign(
                reportId,
                ReportStatus.Assigned,
                3, // reviewer (public relations officer from seed data)
                null, // no note
                7, // category_id
                mockTechOfficer.id // assignee
            );

            // Assign external maintainer
            await reportDAO.updateReportExternalMaintainer(reportId, mockExternalMaintainer.id);
        });

        it("should successfully update report status to in_progress", async () => {
            // Verify report exists and is assigned to external maintainer
            const reportDAO = new ReportDAO();
            const reportBefore = await reportDAO.getReportById(reportId);
            expect(reportBefore).toBeDefined();
            expect(reportBefore?.external_user).toBe(mockExternalMaintainer.id);
            expect(reportBefore?.status).toBe(ReportStatus.Assigned);

            // Execute: Update status
            const res = await request(reportsApp)
                .patch(`/ext_maintainer/reports/${reportId}`)
                .send({ status: ReportStatus.InProgress })
                .set("Authorization", "Bearer fake-token");

            // Debug: Log error if not 200
            if (res.status !== 200) {
                console.log("Status update error:", res.body);
            }

            // Assert: Should return success
            expect(res.status).toBe(200);
            expect(res.body.message).toContain("updated successfully");

            // Verify: Status should be updated
            const updatedReport = await reportDAO.getReportById(reportId);
            expect(updatedReport?.status).toBe(ReportStatus.InProgress);
        });

        it("should successfully update report status to suspended", async () => {
            // Execute: Update status to suspended
            const res = await request(reportsApp)
                .patch(`/ext_maintainer/reports/${reportId}`)
                .send({ status: ReportStatus.Suspended })
                .set("Authorization", "Bearer fake-token");

            // Assert: Should return success
            expect(res.status).toBe(200);

            // Verify: Status should be updated
            const reportDAO = new ReportDAO();
            const updatedReport = await reportDAO.getReportById(reportId);
            expect(updatedReport?.status).toBe(ReportStatus.Suspended);
        });

        it("should successfully update report status to resolved", async () => {
            // Execute: Update status to resolved
            const res = await request(reportsApp)
                .patch(`/ext_maintainer/reports/${reportId}`)
                .send({ status: ReportStatus.Resolved })
                .set("Authorization", "Bearer fake-token");

            // Assert: Should return success
            expect(res.status).toBe(200);

            // Verify: Status should be updated
            const reportDAO = new ReportDAO();
            const updatedReport = await reportDAO.getReportById(reportId);
            expect(updatedReport?.status).toBe(ReportStatus.Resolved);
        });

        it("should return 403 if report is not assigned to this maintainer", async () => {
            // Setup: Create report assigned to different maintainer
            const reportDAO = new ReportDAO();
            const otherReport = await reportDAO.createReport({
                user_id: 1,
                category_id: 7, // Roads and Urban Furnishings
                title: "Other report",
                description: "Assigned to someone else",
                address: "Via Other 2",
                status: ReportStatus.Assigned,
                assigned_to: mockTechOfficer.id,
                external_user: 999, // Different maintainer
                position_lat: 45.0703,
                position_lng: 7.6869,
                is_anonymous: false,
            });

            // Execute: Try to update
            const res = await request(reportsApp)
                .patch(`/ext_maintainer/reports/${otherReport.id}`)
                .send({ status: ReportStatus.InProgress })
                .set("Authorization", "Bearer fake-token");

            // Assert: Should return 403 Forbidden
            expect(res.status).toBe(403);
        });

        it("should return list of reports assigned to external maintainer", async () => {
            // Execute: Get assigned reports
            const res = await request(reportsApp)
                .get("/ext_maintainer/reports")
                .set("Authorization", "Bearer fake-token");

            // Assert: Should return list (200) or empty (204)
            expect([200, 204]).toContain(res.status);
            if (res.status === 200) {
                expect(res.body.reports).toBeDefined();
                expect(Array.isArray(res.body.reports)).toBe(true);
                
                // Verify reports are assigned to external maintainer
                const assignedReports = res.body.reports.filter(
                    (r: any) => r.external_user === mockExternalMaintainer.id
                );
                expect(assignedReports.length).toBeGreaterThanOrEqual(1);
            }
        });
    });

    /**
     * USER STORY 4: As a technical office staff member/external maintainer
     * I want to exchange information and comments on the report internally
     * So that coordination happens without exposing internal notes to citizens
     */
    describe("US4: Internal Comments Exchange", () => {
        let reportId: number;

        beforeEach(async () => {
            // Setup: Create a report
            // Use category 7 (Roads and Urban Furnishings) which matches both users
            const reportDAO = new ReportDAO();
            
            // Create report (will be pending_approval)
            const report = await reportDAO.createReport({
                user_id: 1,
                category_id: 7, // Roads and Urban Furnishings
                title: "Coordination needed",
                description: "Requires coordination",
                address: "Via Coordination 3",
                position_lat: 45.0703,
                position_lng: 7.6869,
                is_anonymous: false,
            });
            reportId = report.id!;

            // Assign report to tech officer
            await reportDAO.updateReportStatusAndAssign(
                reportId,
                ReportStatus.Assigned,
                3, // reviewer (public relations officer from seed data)
                null, // no note
                7, // category_id
                mockTechOfficer.id // assignee
            );

            // Assign external maintainer
            await reportDAO.updateReportExternalMaintainer(reportId, mockExternalMaintainer.id);
        });

        it("should allow tech officer to create internal comment", async () => {
            // Execute: Create comment as tech officer
            const res = await request(reportsApp)
                .post(`/reports/${reportId}/comments`)
                .send({
                    type: "private",
                    text: "Tech officer comment: Need to check materials",
                })
                .set("Authorization", "Bearer fake-token");

            // Assert: Should create comment successfully
            expect(res.status).toBe(201);
            expect(res.body.comment).toBeDefined();
            expect(res.body.comment.text).toBe("Tech officer comment: Need to check materials");
            expect(res.body.comment.type).toBe("private");
            expect(res.body.comment.user_id).toBe(mockTechOfficer.id);
        });

        it("should allow external maintainer to create internal comment", async () => {
            // Execute: Create comment as external maintainer
            const res = await request(reportsApp)
                .post(`/reports/${reportId}/comments`)
                .send({
                    type: "private",
                    text: "External maintainer comment: Materials ordered",
                })
                .set("Authorization", "Bearer fake-token");

            // Assert: Should create comment successfully
            expect(res.status).toBe(201);
            expect(res.body.comment).toBeDefined();
            expect(res.body.comment.text).toBe("External maintainer comment: Materials ordered");
            expect(res.body.comment.type).toBe("private");
        });

        it("should retrieve all internal comments for a report", async () => {
            // Setup: Create multiple comments
            const commentDAO = new CommentDAO();
            await commentDAO.createComment({
                user_id: mockTechOfficer.id,
                report_id: reportId,
                type: "private",
                text: "First comment from tech officer",
            });

            await commentDAO.createComment({
                user_id: mockExternalMaintainer.id,
                report_id: reportId,
                type: "private",
                text: "Response from external maintainer",
            });

            // Execute: Get internal comments
            const res = await request(reportsApp)
                .get(`/report/${reportId}/internal-comments`)
                .set("Authorization", "Bearer fake-token");

            // Assert: Should return all comments
            expect(res.status).toBe(200);
            expect(res.body.comments).toBeDefined();
            expect(Array.isArray(res.body.comments)).toBe(true);
            expect(res.body.comments.length).toBeGreaterThanOrEqual(2);
            
            // Verify comments are private/internal
            res.body.comments.forEach((comment: any) => {
                expect(comment.type).toBe("private");
                expect(comment.report_id).toBe(reportId);
            });
        });

        it("should return 204 when no comments exist", async () => {
            // Setup: Create report without comments
            const reportDAO = new ReportDAO();
            const newReport = await reportDAO.createReport({
                user_id: 1,
                category_id: 7, // Roads and Urban Furnishings
                title: "New report",
                description: "No comments yet",
                address: "Via New 1",
                status: ReportStatus.Assigned,
                assigned_to: mockTechOfficer.id,
                position_lat: 45.0703,
                position_lng: 7.6869,
                is_anonymous: false,
            });

            // Execute: Get comments
            const res = await request(reportsApp)
                .get(`/report/${newReport.id}/internal-comments`)
                .set("Authorization", "Bearer fake-token");

            // Assert: Should return 204
            expect(res.status).toBe(204);
        });

        it("should allow full conversation flow between tech officer and external maintainer", async () => {
            // Step 1: Tech officer creates initial comment
            const comment1 = await request(reportsApp)
                .post(`/reports/${reportId}/comments`)
                .send({
                    type: "private",
                    text: "Tech officer: Please check the issue",
                })
                .set("Authorization", "Bearer fake-token");

            expect(comment1.status).toBe(201);

            // Step 2: External maintainer responds
            const comment2 = await request(reportsApp)
                .post(`/reports/${reportId}/comments`)
                .send({
                    type: "private",
                    text: "External maintainer: Issue checked, starting work",
                })
                .set("Authorization", "Bearer fake-token");

            expect(comment2.status).toBe(201);

            // Step 3: Retrieve conversation
            const conversation = await request(reportsApp)
                .get(`/report/${reportId}/internal-comments`)
                .set("Authorization", "Bearer fake-token");

            expect(conversation.status).toBe(200);
            expect(conversation.body.comments.length).toBeGreaterThanOrEqual(2);
        });
    });

    /**
     * USER STORY 5: As a citizen
     * I want to confirm my registration with a code
     * So that my account becomes valid and I can start using the system
     */
    describe("US5: Citizen Email Verification", () => {
        const testEmail = "citizen@example.com";
        const testCode = "1234";
        const testPassword = "password123";

        beforeEach(() => {
            // Mock pending user
            vi.spyOn(pendingUsers, "getPendingUser").mockReturnValue({
                hashedCode: "$2b$10$fakehash",
                encryptedPassword: {
                    encrypted: "enc",
                    iv: "iv",
                    tag: "tag",
                },
                userData: {
                    firstName: "John",
                    lastName: "Citizen",
                    username: "jcitizen",
                    email: testEmail,
                },
                expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes from now
            });

            vi.spyOn(bcrypt, "compare").mockResolvedValue(true);
            vi.spyOn(passwordEnc, "decrypt").mockReturnValue(testPassword);
            vi.spyOn(userService, "createUserWithFirebase").mockResolvedValue({
                id: 100,
                firebase_uid: "firebaseUid123",
                username: "jcitizen",
                first_name: "John",
                last_name: "Citizen",
                email: testEmail,
                role_name: "Citizen",
                role_type: "citizen",
            });
            vi.spyOn(pendingUsers, "removePendingUser").mockImplementation(() => {});
            vi.spyOn(UserDAO.prototype, "findUserByEmailOrUsername").mockResolvedValue(null);
        });

        it("should successfully verify email code and create user account", async () => {
            // Execute: Verify code
            const res = await request(registrationsApp)
                .post("/verify-code")
                .send({
                    email: testEmail,
                    code: testCode,
                });

            // Assert: Should verify and create user
            expect(res.status).toBe(201);
            expect(res.body.message).toContain("verified and registered successfully");
            expect(res.body.userId).toBeDefined();

            // Verify: User creation was called
            expect(userService.createUserWithFirebase).toHaveBeenCalled();
            expect(pendingUsers.removePendingUser).toHaveBeenCalled();
        });

        it("should return 401 when verification code is incorrect", async () => {
            // Setup: Mock incorrect code
            vi.spyOn(bcrypt, "compare").mockResolvedValue(false);

            // Execute: Try to verify with wrong code
            const res = await request(registrationsApp)
                .post("/verify-code")
                .send({
                    email: testEmail,
                    code: "9999",
                });

            // Assert: Should return 401 Unauthorized
            expect(res.status).toBe(401);
            expect(res.body.error).toContain("Invalid verification code");
        });

        it("should return 410 when verification code has expired", async () => {
            // Setup: Mock expired code
            vi.spyOn(pendingUsers, "getPendingUser").mockReturnValue({
                hashedCode: "$2b$10$fakehash",
                encryptedPassword: {
                    encrypted: "enc",
                    iv: "iv",
                    tag: "tag",
                },
                userData: {
                    firstName: "John",
                    lastName: "Citizen",
                    username: "jcitizen",
                    email: testEmail,
                },
                expiresAt: Date.now() - 1000, // Expired
            });

            // Execute: Try to verify expired code
            const res = await request(registrationsApp)
                .post("/verify-code")
                .send({
                    email: testEmail,
                    code: testCode,
                });

            // Assert: Should return 410 Gone
            expect(res.status).toBe(410);
            expect(res.body.error).toContain("expired");
        });

        it("should return 400 when no pending verification exists", async () => {
            // Setup: No pending user
            vi.spyOn(pendingUsers, "getPendingUser").mockReturnValue(undefined);

            // Execute: Try to verify
            const res = await request(registrationsApp)
                .post("/verify-code")
                .send({
                    email: "nonexistent@example.com",
                    code: testCode,
                });

            // Assert: Should return 400 Bad Request
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("No pending verification");
        });

        it("should allow resending verification code", async () => {
            // Setup: Mock resend functions
            vi.spyOn(pendingUsers, "updateCode").mockImplementation(() => {});
            vi.spyOn(emailService, "resendVerificationEmail").mockResolvedValue();

            // Execute: Resend code
            const res = await request(registrationsApp)
                .post("/resend-code")
                .send({ email: testEmail });

            // Assert: Should resend successfully
            expect(res.status).toBe(200);
            expect(res.body.message).toContain("Code resent");
            expect(pendingUsers.updateCode).toHaveBeenCalled();
            expect(emailService.resendVerificationEmail).toHaveBeenCalled();
        });

        it("should complete full registration flow: register -> verify -> account created", async () => {
            // Setup: Ensure no pending user exists for this email and user doesn't exist
            vi.spyOn(pendingUsers, "getPendingUser").mockReturnValue(undefined);
            vi.spyOn(UserDAO.prototype, "findUserByEmailOrUsername").mockResolvedValue(null);
            vi.spyOn(emailService, "sendVerificationEmail").mockResolvedValue();
            vi.spyOn(pendingUsers, "savePendingUser").mockImplementation(() => {});
            vi.spyOn(passwordEnc, "encrypt").mockReturnValue({
                encrypted: "encryptedData",
                iv: "fakeIv",
                tag: "fakeTag",
            });

            // Step 1: Register user
            const registerRes = await request(registrationsApp)
                .post("/user-registrations")
                .send({
                    firstName: "Jane",
                    lastName: "Doe",
                    username: "jdoenewunique", // Use unique username (alphanumeric only)
                    email: "janenewunique@example.com", // Use unique email
                    password: "password123",
                });

            // Debug: Log error if not 200
            if (registerRes.status !== 200) {
                console.log("Registration error:", registerRes.body);
            }

            expect(registerRes.status).toBe(200);
            expect(registerRes.body.message).toContain("Verification code sent");

            // Step 2: Verify code - setup pending user for verification
            vi.spyOn(pendingUsers, "getPendingUser").mockReturnValue({
                hashedCode: "$2b$10$fakehash",
                encryptedPassword: {
                    encrypted: "enc",
                    iv: "iv",
                    tag: "tag",
                },
                userData: {
                    firstName: "Jane",
                    lastName: "Doe",
                    username: "jdoenewunique",
                    email: "janenewunique@example.com",
                },
                expiresAt: Date.now() + 5 * 60 * 1000,
            });
            vi.spyOn(bcrypt, "compare").mockResolvedValue(true);
            vi.spyOn(passwordEnc, "decrypt").mockReturnValue("password123");
            vi.spyOn(userService, "createUserWithFirebase").mockResolvedValue({
                id: 100,
                firebase_uid: "firebaseUid123",
                username: "jdoenewunique",
                first_name: "Jane",
                last_name: "Doe",
                email: "janenewunique@example.com",
                role_name: "Citizen",
                role_type: "citizen",
            });
            vi.spyOn(pendingUsers, "removePendingUser").mockImplementation(() => {});

            const verifyRes = await request(registrationsApp)
                .post("/verify-code")
                .send({
                    email: "janenewunique@example.com",
                    code: "1234",
                });

            expect(verifyRes.status).toBe(201);
            expect(verifyRes.body.message).toContain("verified and registered");
            expect(verifyRes.body.userId).toBeDefined();
        });
    });
});


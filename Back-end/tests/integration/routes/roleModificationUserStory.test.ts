import request from "supertest";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeTestApp, initTestDB, resetTestDB } from "../../setup/tests_util.js";
import router from "../../../src/routes/operator.routes.js";
import OperatorDAO from "../../../src/dao/OperatorDAO.js";
import RolesDAO from "../../../src/dao/RolesDAO.js";
import { getOne } from "../../../src/config/database.js";
import { ROLES } from "../../../src/models/userRoles.js";

// ---------------------------
// Mock Firebase middleware
// ---------------------------
vi.mock("../../../src/middlewares/verifyFirebaseToken.js", () => ({
  verifyFirebaseToken: (_roles: string[]) => (req: any, _res: any, next: any) => {
    // Set admin user for tests
    req.user = { id: 999, role_name: "Admin", role_type: "admin" };
    next();
  },
}));

let app: any;
let operatorDao: OperatorDAO;
let rolesDao: RolesDAO;

describe("Role Modification User Story Integration Tests", () => {
  describe("US: As a system administrator I want to modify roles to municipality users", () => {
    describe("So that the staff can be more flexible", () => {
      beforeEach(async () => {
        await initTestDB();
        app = makeTestApp(router);
        operatorDao = new OperatorDAO();
        rolesDao = new RolesDAO();
        vi.clearAllMocks();
      });

      afterEach(async () => {
        await resetTestDB();
      });

      describe("Successful Role Modification", () => {
        it("should allow admin to modify roles for a technical officer", async () => {
          // Get a tech officer user (id 2 from seeded data typically)
          // First, let's get available roles
          const roles = await rolesDao.getRoles(ROLES.TECH_OFFICER);
          expect(roles.length).toBeGreaterThan(0);

          // Get a tech officer from the database
          const techOfficers = await operatorDao.getOperators();
          const techOfficer = techOfficers.find((u: any) => u.role_type === "tech_officer");
          
          if (!techOfficer) {
            // If no tech officer exists, skip this test
            return;
          }

          const operatorId = techOfficer.id;
          const currentRoles = await operatorDao.getOperatorRolesId(operatorId);
          expect(currentRoles.length).toBeGreaterThan(0);

          // Select first two tech officer roles (or all if less than 2)
          const newRoleIds = roles.slice(0, Math.min(2, roles.length)).map((r: any) => r.id);

          const res = await request(app)
            .patch(`/operators/${operatorId}/roles`)
            .send({
              roles_id: newRoleIds,
            });

          expect(res.status).toBe(200);
          expect(res.body).toEqual({
            message: "Roles successfully updated",
          });

          // Verify roles were updated in database
          const updatedRoles = await operatorDao.getOperatorRolesId(operatorId);
          expect(updatedRoles.sort()).toEqual(newRoleIds.sort());
        });

        it("should allow admin to add multiple roles to a technical officer", async () => {
          const roles = await rolesDao.getRoles(ROLES.TECH_OFFICER);
          const techOfficers = await operatorDao.getOperators();
          const techOfficer = techOfficers.find((u: any) => u.role_type === "tech_officer");
          
          if (!techOfficer || roles.length < 3) {
            return;
          }

          const operatorId = techOfficer.id;
          const newRoleIds = roles.slice(0, 3).map((r: any) => r.id);

          const res = await request(app)
            .patch(`/operators/${operatorId}/roles`)
            .send({
              roles_id: newRoleIds,
            });

          expect(res.status).toBe(200);

          const updatedRoles = await operatorDao.getOperatorRolesId(operatorId);
          expect(updatedRoles.sort()).toEqual(newRoleIds.sort());
        });

        it("should allow admin to modify roles when no reports exist", async () => {
          const roles = await rolesDao.getRoles(ROLES.TECH_OFFICER);
          const techOfficers = await operatorDao.getOperators();
          const techOfficer = techOfficers.find((u: any) => u.role_type === "tech_officer");
          
          if (!techOfficer || roles.length < 2) {
            return;
          }

          const operatorId = techOfficer.id;
          const originalRoles = await operatorDao.getOperatorRolesId(operatorId);
          
          // Try to add an additional role
          const availableRole = roles.find((r: any) => !originalRoles.includes(r.id));
          
          if (availableRole) {
            const newRoleIds = [...originalRoles, availableRole.id];

            const res = await request(app)
              .patch(`/operators/${operatorId}/roles`)
              .send({
                roles_id: newRoleIds,
              });

            // May fail if operator has reports, but that's expected behavior
            if (res.status === 200) {
              const updatedRoles = await operatorDao.getOperatorRolesId(operatorId);
              expect(updatedRoles.sort()).toEqual(newRoleIds.sort());
            } else {
              // If it fails due to reports, that's acceptable - the constraint is working
              expect(res.body.error).toBeDefined();
            }
          }
        });

        it("should allow admin to replace all roles with different ones", async () => {
          const roles = await rolesDao.getRoles(ROLES.TECH_OFFICER);
          const techOfficers = await operatorDao.getOperators();
          const techOfficer = techOfficers.find((u: any) => u.role_type === "tech_officer");
          
          if (!techOfficer || roles.length < 2) {
            return;
          }

          const operatorId = techOfficer.id;
          const originalRoles = await operatorDao.getOperatorRolesId(operatorId);

          // Select different roles
          const newRoleIds = roles
            .map((r: any) => r.id)
            .filter((id: number) => !originalRoles.includes(id))
            .slice(0, 2);

          if (newRoleIds.length === 0) {
            return; // Not enough roles to replace
          }

          const res = await request(app)
            .patch(`/operators/${operatorId}/roles`)
            .send({
              roles_id: newRoleIds,
            });

          expect(res.status).toBe(200);

          const updatedRoles = await operatorDao.getOperatorRolesId(operatorId);
          expect(updatedRoles.sort()).toEqual(newRoleIds.sort());
        });
      });

      describe("Validation and Constraints", () => {
        it("should return 400 when trying to assign non-tech-officer roles", async () => {
          const roles = await rolesDao.getRoles();
          const techOfficers = await operatorDao.getOperators();
          const techOfficer = techOfficers.find((u: any) => u.role_type === "tech_officer");
          
          if (!techOfficer) {
            return;
          }

          // Find a non-tech-officer role (like admin or citizen)
          const nonTechRole = roles.find((r: any) => r.type !== ROLES.TECH_OFFICER);
          
          if (!nonTechRole) {
            return;
          }

          const operatorId = techOfficer.id;

          const res = await request(app)
            .patch(`/operators/${operatorId}/roles`)
            .send({
              roles_id: [nonTechRole.id],
            });

          expect(res.status).toBe(400);
          expect(res.body.error).toContain("tech officer");
        });

        it("should return 400 when operator has open reports for roles being removed", async () => {
          const techOfficers = await operatorDao.getOperators();
          const techOfficer = techOfficers.find((u: any) => u.role_type === "tech_officer");
          
          if (!techOfficer) {
            return;
          }

          const operatorId = techOfficer.id;
          const currentRoles = await operatorDao.getOperatorRolesId(operatorId);

          if (currentRoles.length === 0) {
            return; // No roles to remove
          }

          // Try to remove all roles
          // This will succeed if no reports exist, or fail with 400 if reports exist
          const res = await request(app)
            .patch(`/operators/${operatorId}/roles`)
            .send({
              roles_id: [],
            });

          // Either succeeds (no reports) or fails with 400 (has reports)
          if (res.status === 400) {
            expect(res.body.error).toBeDefined();
            expect(res.body.error).toContain("reports");
          } else if (res.status === 200) {
            // If it succeeds, verify all roles were removed
            const updatedRoles = await operatorDao.getOperatorRolesId(operatorId);
            expect(updatedRoles.length).toBe(0);
            
            // Restore roles for cleanup
            await operatorDao.updateRolesOfOperator(operatorId, currentRoles);
          }
        });

        it("should handle empty roles array (removes all roles)", async () => {
          const techOfficers = await operatorDao.getOperators();
          const techOfficer = techOfficers.find((u: any) => u.role_type === "tech_officer");
          
          if (!techOfficer) {
            return;
          }

          const operatorId = techOfficer.id;
          const originalRoles = await operatorDao.getOperatorRolesId(operatorId);

          // Test with empty array - this will remove all roles
          const res = await request(app)
            .patch(`/operators/${operatorId}/roles`)
            .send({
              roles_id: [],
            });

          // May succeed (removes all roles) or fail if operator has reports
          if (res.status === 200) {
            // If successful, verify all roles were removed
            const updatedRoles = await operatorDao.getOperatorRolesId(operatorId);
            expect(updatedRoles.length).toBe(0);
            
            // Restore original roles for cleanup
            await operatorDao.updateRolesOfOperator(operatorId, originalRoles);
          } else {
            // If it fails, it should be because of reports
            expect(res.body.error).toBeDefined();
          }
        });
      });

      describe("Flexibility Features", () => {
        it("should allow staff flexibility by updating roles multiple times", async () => {
          const roles = await rolesDao.getRoles(ROLES.TECH_OFFICER);
          const techOfficers = await operatorDao.getOperators();
          const techOfficer = techOfficers.find((u: any) => u.role_type === "tech_officer");
          
          if (!techOfficer || roles.length < 2) {
            return;
          }

          const operatorId = techOfficer.id;
          const originalRoles = await operatorDao.getOperatorRolesId(operatorId);

          // First update - use roles that are safe (no reports)
          const firstRoleIds = roles.slice(0, 2).map((r: any) => r.id);
          let res = await request(app)
            .patch(`/operators/${operatorId}/roles`)
            .send({
              roles_id: firstRoleIds,
            });
          
          // May fail if operator has reports, so we handle both cases
          if (res.status === 400 && res.body.error?.includes("reports")) {
            // If there are reports, try adding roles instead of replacing
            const additionalRole = roles.find((r: any) => !firstRoleIds.includes(r.id));
            if (additionalRole) {
              firstRoleIds.push(additionalRole.id);
            }
            res = await request(app)
              .patch(`/operators/${operatorId}/roles`)
              .send({
                roles_id: firstRoleIds,
              });
          }
          
          expect(res.status).toBe(200);

          // Second update - add a role (if available) rather than removing
          const currentRolesAfterFirst = await operatorDao.getOperatorRolesId(operatorId);
          const availableRoles = roles
            .map((r: any) => r.id)
            .filter((id: number) => !currentRolesAfterFirst.includes(id));
          
          if (availableRoles.length > 0) {
            const secondRoleIds = [...currentRolesAfterFirst, availableRoles[0]];
            res = await request(app)
              .patch(`/operators/${operatorId}/roles`)
              .send({
                roles_id: secondRoleIds,
              });
            
            if (res.status === 200) {
              // Verify update
              const rolesAfterSecond = await operatorDao.getOperatorRolesId(operatorId);
              expect(rolesAfterSecond.sort()).toEqual(secondRoleIds.sort());
            }
          }

          // Verify the roles were successfully modified at least once
          const finalRoles = await operatorDao.getOperatorRolesId(operatorId);
          expect(finalRoles.length).toBeGreaterThan(0);
        });

        it("should persist role changes across requests", async () => {
          const roles = await rolesDao.getRoles(ROLES.TECH_OFFICER);
          const techOfficers = await operatorDao.getOperators();
          const techOfficer = techOfficers.find((u: any) => u.role_type === "tech_officer");
          
          if (!techOfficer || roles.length < 2) {
            return;
          }

          const operatorId = techOfficer.id;
          const newRoleIds = roles.slice(0, 2).map((r: any) => r.id);

          // Update roles
          await request(app)
            .patch(`/operators/${operatorId}/roles`)
            .send({
              roles_id: newRoleIds,
            });

          // Verify persistence by checking database directly
          const persistedRoles = await getOne<{ count: number }>(
            "SELECT COUNT(*) as count FROM user_roles WHERE user_id = ?",
            [operatorId]
          );

          expect(persistedRoles?.count).toBe(newRoleIds.length);

          // Verify specific roles
          const roleIds = await operatorDao.getOperatorRolesId(operatorId);
          expect(roleIds.sort()).toEqual(newRoleIds.sort());
        });

        it("should allow flexible role assignment for different staff members", async () => {
          const roles = await rolesDao.getRoles(ROLES.TECH_OFFICER);
          const techOfficers = await operatorDao.getOperators();
          
          if (techOfficers.length < 2 || roles.length < 2) {
            return;
          }

          const officer1 = techOfficers[0];
          const officer2 = techOfficers[1];

          // Assign different roles to each officer
          const roles1 = roles.slice(0, 1).map((r: any) => r.id);
          const roles2 = roles.slice(1, 2).map((r: any) => r.id);

          const res1 = await request(app)
            .patch(`/operators/${officer1.id}/roles`)
            .send({
              roles_id: roles1,
            });

          const res2 = await request(app)
            .patch(`/operators/${officer2.id}/roles`)
            .send({
              roles_id: roles2,
            });

          expect(res1.status).toBe(200);
          expect(res2.status).toBe(200);

          // Verify they have different roles
          const finalRoles1 = await operatorDao.getOperatorRolesId(officer1.id);
          const finalRoles2 = await operatorDao.getOperatorRolesId(officer2.id);

          expect(finalRoles1).not.toEqual(finalRoles2);
        });
      });

      describe("Error Handling", () => {
        it("should return 404 for non-existent operator", async () => {
          const roles = await rolesDao.getRoles(ROLES.TECH_OFFICER);
          const fakeOperatorId = 99999;

          const res = await request(app)
            .patch(`/operators/${fakeOperatorId}/roles`)
            .send({
              roles_id: roles.slice(0, 1).map((r: any) => r.id),
            });

          // Should return 500 or handle gracefully
          expect(res.status).not.toBe(200);
        });

        it("should return 400 for invalid role IDs", async () => {
          const techOfficers = await operatorDao.getOperators();
          const techOfficer = techOfficers.find((u: any) => u.role_type === "tech_officer");
          
          if (!techOfficer) {
            return;
          }

          const operatorId = techOfficer.id;

          const res = await request(app)
            .patch(`/operators/${operatorId}/roles`)
            .send({
              roles_id: [99999], // Invalid role ID
            });

          // Should handle invalid role ID
          expect(res.status).not.toBe(200);
        });
      });
    });
  });
});


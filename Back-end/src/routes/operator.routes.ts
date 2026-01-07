import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { body, validationResult, param, query } from "express-validator";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js";
import { ROLES } from "../models/userRoles.js";
import UserDAO from "../dao/UserDAO.js";
import RolesDAO from "../dao/RolesDAO.js";
import OperatorDAO, { type ExternalMaintainerFilters } from "../dao/OperatorDAO.js";
import { createUserWithFirebase, UserAlreadyExistsError, EmailOrUsernameConflictError } from "../services/userService.js";


const router = Router();
const operatorDao = new OperatorDAO();
const userDao = new UserDAO();
const rolesDao = new RolesDAO();

// GET all operators
router.get("/operators", verifyFirebaseToken([ROLES.ADMIN]), async (req: Request, res: Response) => {
  try {
    const operatorsList = await operatorDao.getOperators();

    if (Array.isArray(operatorsList) && operatorsList.length === 0) {
      return res.status(204).send(); // No Operators saved
    }

    res.status(200).json(operatorsList);

  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET all operators for a specific category
router.get("/categories/:categoryId/operators",
  [
    param("categoryId").isInt().withMessage("Category ID must be a valid integer"),
  ],
  verifyFirebaseToken([ROLES.PUB_RELATIONS]),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty() && errors !== undefined) {
      const errs = errors.array();
      const firstError = errs[0]?.msg;
      return res.status(400).json({ error: firstError });
    }


    try {

      const categoryId = Number(req.params.categoryId);

      const InternalUsersByCategory = await operatorDao.getOperatorsByCategory(categoryId);

      if (Array.isArray(InternalUsersByCategory) && InternalUsersByCategory.length === 0) {
        return res.status(204).send(); // No Operators saved
      }

      res.status(200).json(InternalUsersByCategory);

    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

// ADD a new operator
router.post("/operator-registrations",
  verifyFirebaseToken([ROLES.ADMIN]),
  [
    body("firstName").isString().notEmpty().withMessage("First name is required"),
    body("lastName").isString().notEmpty().withMessage("Last name is required"),
    body("username").isAlphanumeric().notEmpty().withMessage("Username must be alphanumeric"),
    body("email").isEmail().normalizeEmail().withMessage("Email must be valid"),
    body("password").isString().notEmpty().withMessage("Password is required"),
    body("role_id").isNumeric().notEmpty().withMessage("Role ID must be numeric"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      //Extract the validation error messages 
      const extractedErrors = errors.array().map(err => err.msg);
      return res.status(400).json({ errors: extractedErrors });
    }

    try {
      const { firstName, lastName, username, email, password, role_id } = req.body;

      // 1 == citizen, 4 == admin, an admin is not allowed to create admin or citizen accounts
      if (role_id === 1 || role_id === 4) {
        return res.status(422).json({ error: "Invalid role data, cannot assign admin or citizen" });
      }

      const newUser = await createUserWithFirebase(
        { firstName, lastName, username, email, password, role_id },
        userDao
      );

      return res.status(201).json({
        message: "User created successfully",
        userId: newUser.id,
      });

    } catch (error: any) {
      if (error instanceof EmailOrUsernameConflictError) {
        return res.status(422).json({ error: error.message });
      }
      if (error instanceof UserAlreadyExistsError) {
        return res.status(409).json({ error: error.message });
      }
      if (error.code === "auth/email-already-exists") {
        return res.status(422).json({ error: error.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET external maintainers with optional filters
router.get("/external-maintainers",
  verifyFirebaseToken([ROLES.TECH_OFFICER, ROLES.PUB_RELATIONS, ROLES.ADMIN]),
  [
    query("companyId").optional().isInt({gt:0}).withMessage("CompanyId must be a positive integer"),
    query("categoryId").optional().isInt({gt:0}).withMessage("CategoryId must be a positive integer"),
  ],

  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Handle validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const extractedErrors = errors.array().map(err => err.msg);
        return res.status(400).json({ errors: extractedErrors });
      }

      const operatorDao = new OperatorDAO();

      const filters: ExternalMaintainerFilters = {
        companyId: Number(req.query.companyId),
        categoryId: Number(req.query.categoryId),
      };

      // Fetch external maintainers
      const externalMaintainers = await operatorDao.getExternalMaintainersByFilter(filters);
      if (!externalMaintainers || externalMaintainers.length === 0) {
        return res.status(204).send(); // No external maintainers found
      }

      res.status(200).json(externalMaintainers);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);


// Update the roles of an operators
router.patch("/operators/:operatorId/roles",
    verifyFirebaseToken([ROLES.ADMIN]),
    async (req: Request, res: Response) => {
        try {

            const operatorId = Number(req.params.operatorId);
            const { roles_id } = req.body;

            // Throw an error if the roles to be changed to are not of type tech officer
            const rolesInfo = await rolesDao.getRolesByIds(roles_id);

            const roles_type = rolesInfo.map(role => role.type);

            if (roles_type.some(type => type !== ROLES.TECH_OFFICER)) {
              return res.status(400).json({ error: "Changing roles is not allowed to roles that are not of type tech officer" });
            }

            const existingRoles = await operatorDao.getOperatorRolesId(operatorId);

            const rolesToBeCanceled = existingRoles.filter(role => !roles_id.includes(role));


            // get the roles to be canceled for which that operator has at least one report open [open is defined as not resolved]
            const conflictingRoles = await operatorDao.getOperatorRolesIfReportExists(operatorId, rolesToBeCanceled);


            if (conflictingRoles.length > 0) {
              return res.status(400).json({ error: "This internal officer has reports for some roles", conflicting_roles: conflictingRoles });
            }

            await operatorDao.updateRolesOfOperator(operatorId, roles_id);
           
            return res.status(200).json({
                message: "Roles successfully updated"
            });

        } catch (error) {
            console.log(error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

export default router;
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js";
import { ROLES } from "../models/userRoles.js";
import UserDAO from "../dao/UserDAO.js";
import OperatorDAO from "../dao/OperatorDAO.js";
import { createUserWithFirebase, UserAlreadyExistsError, EmailOrUsernameConflictError } from "../services/userService.js";


const router = Router();
const operatorDao = new OperatorDAO();
const userDao = new UserDAO();

// GET all operators
router.get("/operators", verifyFirebaseToken([ROLES.ADMIN]), async (req, res) => {
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
router.get("/categories/:categoryId/operators", verifyFirebaseToken([ROLES.PUB_RELATIONS]), async (req, res) => {
  try {

    const categoryId = Number(req.params.categoryId);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: "Category ID must be a valid number" });
    }

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
    body("firstName").isString().notEmpty(),
    body("lastName").isString().notEmpty(),
    body("username").isAlphanumeric().notEmpty(),
    body("email").isEmail().normalizeEmail(),
    body("password").isString().notEmpty(),
    body("role_id").isNumeric().notEmpty(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Invalid request data" });
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

      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js";
import { ROLES } from "../models/userRoles.js";
import UserDAO from "../dao/UserDAO.js";
import OperatorDAO from "../dao/OperatorDAO.js";
import firebaseAdmin from "../config/firebaseAdmin.js";

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

      // Controlla se email o username sono già usati
      const conflictUser = await userDao.findUserByEmailOrUsername(email, username);
      if (conflictUser) {
        return res.status(422).json({ error: "Email or username already in use" });
      }

      // Crea il nuovo account firebase
      const firebaseUser = await firebaseAdmin.auth().createUser({
        email,
        password,
      });

      // Crea il nuovo account localmente
      const newUser = await operatorDao.createOperator({
        firebaseUid: firebaseUser.uid,
        firstName,
        lastName,
        username,
        email,
        role_id,
      });

      return res.status(201).json({
        message: "User created successfully",
        userId: newUser.id,
      });
    } catch (error: any) {
      console.error(error);

      if (error.code === "auth/email-already-exists") {
        return res.status(409).json({ error: "Email already registered in Firebase" });
      }

      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
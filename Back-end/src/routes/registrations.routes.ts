import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js";
import UserDAO from "../dao/UserDAO.js";
import { ROLES } from "../models/userRoles.js";

const router = Router();
const userDao = new UserDAO();

// Registrates a new User
router.post("/user-registrations",
    verifyFirebaseToken([ROLES.ADMIN, ROLES.OPERATOR, ROLES.CITIZEN]),
    [
        body("firebaseUid").isString().notEmpty(),
        body("firstName").isString().notEmpty(),
        body("lastName").isString().notEmpty(),
        body("username").isAlphanumeric().notEmpty(),
        body("email").isEmail().normalizeEmail(),
    ],
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: "Invalid request data" });
        }

        try {
            const { firebaseUid, firstName, lastName, username, email } = req.body;

            // Controllo che l'UID nel token corrisponda a quello nel body
            if (firebaseUid !== req.uid) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            // Controlla se utente esiste già per UID
            const existingUser = await userDao.findUserByUid(firebaseUid);
            if (existingUser) {
                return res.status(409).json({ error: "User already registered" });
            }

            // Controlla se email o username sono già usati
            const conflictUser = await userDao.findUserByEmailOrUsername(email, username);
            if (conflictUser) {
                return res.status(422).json({ error: "Email or username already in use" });
            }

            // Crea il nuovo utente
            const newUser = await userDao.createUser({ firebaseUid, firstName, lastName, username, email });

            return res.status(201).json({
                message: "User data saved successfully",
                userId: newUser.id,
            });


        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);


export default router;
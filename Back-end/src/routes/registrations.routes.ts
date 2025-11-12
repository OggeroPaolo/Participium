import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import UserDAO from "../dao/UserDAO.js";
import { createUserWithFirebase, UserAlreadyExistsError, EmailOrUsernameConflictError } from "../services/userService.js";

const router = Router();
const userDao = new UserDAO();

// Registrates a new User
router.post("/user-registrations",
    [
        body("firstName").isString().notEmpty(),
        body("lastName").isString().notEmpty(),
        body("username").isAlphanumeric().notEmpty(),
        body("email").isEmail().normalizeEmail(),
        body("password").isString()
    ],
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: "Invalid request data" });
        }

        try {
            const { firstName, lastName, username, email, password } = req.body;

            const newUser = await createUserWithFirebase({ firstName, lastName, username, email, password }, userDao);

            return res.status(201).json({
                message: "User data saved successfully",
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
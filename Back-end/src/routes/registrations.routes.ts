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
        body("firstName").isString().notEmpty().withMessage("First name is required"),
        body("lastName").isString().notEmpty().withMessage("Last name is required"),
        body("username").isAlphanumeric().notEmpty().withMessage("Username must be alphanumeric and not empty"),
        body("email").isEmail().normalizeEmail().withMessage("Email must be valid"),
        body("password").isString().withMessage("Password must be a string")
    ],
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            //Extract the validation error messages 
            const extractedErrors = errors.array().map(err => err.msg);
            return res.status(400).json({ errors: extractedErrors });
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
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);


export default router;
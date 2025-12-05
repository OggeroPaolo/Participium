import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import UserDAO from "../dao/UserDAO.js";
import { createUserWithFirebase, UserAlreadyExistsError, EmailOrUsernameConflictError } from "../services/userService.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { savePendingUser, getPendingUser, removePendingUser } from "../services/pendingUsersService.js";
import { sendVerificationEmail } from "../services/emailService.js";

const router = Router();
const userDao = new UserDAO();

// Registrates a new User
router.post("/user-registrations",
    [
        body("firstName").isString().notEmpty().withMessage("First name is required"),
        body("lastName").isString().notEmpty().withMessage("Last name is required"),
        body("username").isAlphanumeric().notEmpty().withMessage("Username must be alphanumeric and not empty"),
        body("email").isEmail().normalizeEmail({gmail_remove_dots:false}).withMessage("Email must be valid"),
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

            // NOTE: Do NOT create a Firebase user yet!
            // First, create verification code.
            const code = crypto.randomInt(1000, 9999).toString();

            // Hash the code using bcrypt
            const hashedCode = await bcrypt.hash(code, 10);

            // Store user data with hashed password + hashed code in memory for 30 minutes
            await savePendingUser(email, {
                hashedCode,
                userData: { firstName, lastName, username, email, password: password },
                expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
            });

            await sendVerificationEmail(email, code);

            return res.status(200).json({
                message: "Verification code sent to your email",
            });

        } catch (error: any) {
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);


router.post("/verify-code", 
    [
        body("email").isEmail().normalizeEmail({gmail_remove_dots:false}),
        body("code").isNumeric()
    ],
    async (req: Request, res: Response) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const extractedErrors = errors.array().map(err => err.msg);
            return res.status(400).json({ errors: extractedErrors });
        }

        const { email, code } = req.body;

        const pending = getPendingUser(email);
        if (!pending) {
            return res.status(400).json({ error: "No pending verification for this email" });
        }

        // Check expiration
        if (Date.now() > pending.expiresAt) {
            removePendingUser(email);
            return res.status(410).json({ error: "Verification code expired" });
        }

        // Verify code
        const codeMatches = await bcrypt.compare(code, pending.hashedCode);
        if (!codeMatches) {
            return res.status(401).json({ error: "Invalid verification code" });
        }

        // Create user in Firebase + DB
        try {
            const newUser = await createUserWithFirebase(pending.userData, userDao);

            // Cleanup
            removePendingUser(email);

            return res.status(201).json({
                message: "User verified and registered successfully",
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
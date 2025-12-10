import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import UserDAO from "../dao/UserDAO.js";
import { createUserWithFirebase, UserAlreadyExistsError, EmailOrUsernameConflictError } from "../services/userService.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendVerificationEmail, resendVerificationEmail } from "../services/emailService.js";
import { codeSalt } from "../services/passwordEncryptionSercive.js";

const router = Router();
const userDao = new UserDAO();

// Registrates a new User
router.post("/user-registrations",
    [
        body("firstName").isString().notEmpty().withMessage("First name is required"),
        body("lastName").isString().notEmpty().withMessage("Last name is required"),
        body("username").isAlphanumeric().notEmpty().withMessage("Username must be alphanumeric and not empty"),
        body("email").isEmail().normalizeEmail({ gmail_remove_dots: false }).withMessage("Email must be valid"),
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

            // Controllo conflitti email/username a priori
            const conflictUser = await userDao.findUserByEmailOrUsername(email, username);
            if (conflictUser) {
                throw new EmailOrUsernameConflictError("Email or username already in use");
            }

            // Create verification code.
            const code = crypto.randomInt(1000, 9999).toString();

            // Hash the code using bcrypt
            const hashedCode = await bcrypt.hash(code, codeSalt);

            const newUser = await createUserWithFirebase({firstName, lastName, username, email, password, hashedCode }, userDao);

            await sendVerificationEmail(email, code);

            return res.status(200).json({
                message: "Verification code sent to your email",
            });

        } catch (error: any) {
            console.log(error)
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


router.post("/verify-code",
    [
        body("email").isEmail().normalizeEmail({ gmail_remove_dots: false }),
        body("code").isNumeric()
    ],
    async (req: Request, res: Response) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const extractedErrors = errors.array().map(err => err.msg);
            return res.status(400).json({ errors: extractedErrors });
        }

        const { email, code } = req.body;

        const codeExpiry = await userDao.findCodeExpiryByEmail(email);

        if (!codeExpiry || codeExpiry?.is_verified !== 0) {
            return res.status(400).json({ error: "No pending verification for this email" });
        }

        // Check if code has expired
        if (Date.now() > codeExpiry.code_expires_at.getTime()) {
            return res.status(410).json({ error: "Verification code expired" });
        }

        // Verify if code matches the hash
        const codeMatches = await bcrypt.compare(code, codeExpiry.hashedCode);
        if (!codeMatches) {
            return res.status(401).json({ error: "Invalid verification code" });
        }

        // Set the user as verified
        try {
            const wasUpdated = await userDao.verifyUserByEmail(email);

            if (wasUpdated) {
                return res.status(201).json({
                    message: "User verified successfully",
                });
            } else {
                return res.status(400).json({
                    message: "User NOT verified successfully",
                });
            }


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


router.post("/resend-code",
    [
        body("email").isEmail().normalizeEmail({ gmail_remove_dots: false }),
    ],
    async (req: Request, res: Response) => {
        try {

            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const extractedErrors = errors.array().map(err => err.msg);
                return res.status(400).json({ errors: extractedErrors });
            }

            const { email } = req.body;

            // Check if there is a pending user for the given email
            const codeExpiry = await userDao.findCodeExpiryByEmail(email);
            if (!codeExpiry || codeExpiry?.is_verified !== 0) {
                return res.status(400).json({ error: "No pending verification for this email" });
            }

            // Recreate verification code.
            const code = crypto.randomInt(1000, 9999).toString();
            const hashedCode = await bcrypt.hash(code, codeSalt);

            // Update verification code for pending user
            const wasUpdated = await userDao.updateCodeByEmail(email, hashedCode);

            if (!wasUpdated) {
                return res.status(400).json({
                    message: "New code was not generated"
                });
            }

            // Check if code has expired
            await resendVerificationEmail(email, code);

            return res.status(200).json({
                message: "Code resent via email"
            });
        }
        catch (error: any) {
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

export default router;
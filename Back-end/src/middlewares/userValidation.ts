import { body, param, validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';


export const validatePatchUser = [
    param("userId").isInt().withMessage("User ID must be a valid integer"),
    body("telegram_username").optional({ nullable: true }).isString().withMessage("telegram_username must be a string"),
    body("email_notifications_enabled").optional({ nullable: true }).isBoolean().withMessage("email_notifications_enabled must be a boolean").toBoolean(),
    (req: Request, res: Response, next: NextFunction) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                const extractedErrors = errors.array().map(err => err.msg);
                return res.status(400).json({ errors: extractedErrors });
            }
            next();
        }
];
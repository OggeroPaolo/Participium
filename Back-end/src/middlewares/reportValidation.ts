import { body, param, validationResult } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';
import { ReportStatus } from '../models/reportStatus.js';

export const validateCreateReport = [
    body("category_id").isInt().withMessage("category_id must be an integer"),
    body("title").isString().notEmpty().withMessage("title is required"),
    body("description").isString().notEmpty().withMessage("description is required"),
    body("position_lat").isFloat().withMessage("position_lat must be a number"),
    body("position_lng").isFloat().withMessage("position_lng must be a number"),
    body("is_anonymous").isBoolean().withMessage("is_anonymous must be a boolean"),
    (req: Request, res: Response, next: NextFunction) => {
        const files = Array.isArray(req.files) ? req.files : [];

        if (files.length === 0) {
            return res.status(400).json({ errors: [{ msg: "At least one photo is required", param: "photos" }] });
        }
        if (files.length > 3) {
            return res.status(400).json({ errors: [{ msg: "A maximum of 3 photos can be uploaded", param: "photos" }] });
        }
        next();
    },
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

export const validateGetReport = [
    param("reportId").isInt().withMessage("reportId must be a valid integer"),
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

export const validateOfficersGetReports = [
    param("officerId").isInt().withMessage("officerId must be a valid integer"),
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];


export const validateGetReports = [
    (req: Request, res: Response, next: NextFunction) => {
        const status = req.query.status as string | undefined;
        if (status && !Object.values(ReportStatus).includes(status as ReportStatus)) {
            return res.status(400).json({ error: `Invalid status filter: ${status}` });
        }
        next();
    }
];
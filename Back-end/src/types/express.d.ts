import type { Request } from "express";
import { User } from "../models/user.ts";
import type { Report } from "../models/report.ts";

declare module "express-serve-static-core" {
    interface Request {
        uid?: String;
        files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
        user?: User;
        authorizedReport?: Report
    }
}
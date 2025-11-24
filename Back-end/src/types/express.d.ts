import type { Request } from "express";

declare module "express-serve-static-core" {
    interface Request {
        uid?: String;
        files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
    }
}
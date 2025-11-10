import type { Request, Response, NextFunction } from "express";
import firebaseAdmin from "../config/firebaseAdmin.js";
import UserDAO from "../dao/UserDAO.js";

const userDAO = new UserDAO();

export function verifyFirebaseToken(allowedRoles: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const idToken = authHeader.split(" ")[1];
            if (!idToken) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
            req.uid = decodedToken.uid;

            // Fetch user from database
            const user = await userDAO.findUserByUid(decodedToken.uid);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            // Check role authorization
            if (!allowedRoles.includes(user.role_name)) {
                return res.status(403).json({ error: "Forbidden: insufficient permissions" });
            }

            // Attach user to request for downstream use
            (req as any).user = user;

            next();
        } catch (error) {
            return res.status(401).json({ error: "Unauthorized" });
        }
    }
}

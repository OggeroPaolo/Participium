import type { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";

export async function verifyFirebaseToken(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const idToken = authHeader.split(" ")[1];
        if (!idToken) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.uid = decodedToken.uid;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Unauthorized" });
    }
}

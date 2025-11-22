import { Router } from "express";
import type { Request, Response } from "express";
import UserDAO from "../dao/UserDAO.js";
import { ROLES } from "../models/userRoles.js";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js";

const router = Router();
const userDao = new UserDAO();

// Get user by Firebase UID
router.get("/users/:firebaseUid", verifyFirebaseToken([ROLES.ADMIN, ROLES.CITIZEN, ROLES.PUB_RELATIONS, ROLES.TECH_OFFICER]), async (req: Request, res: Response) => {
    const { firebaseUid } = req.params;


    if (!firebaseUid) {
        return res.status(400).json({ error: "Firebase UID is required" });
    }

    try {
        const user = await userDao.findUserByUid(firebaseUid);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(200).json({ user });
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

export default router;

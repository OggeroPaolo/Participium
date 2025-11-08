import { Router } from "express";
import RolesDao from "../dao/RolesDAO.js";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js";
import { ROLES } from "../models/userRoles.js";

const router = Router();

// Health check endpoint
router.get("/roles", verifyFirebaseToken([ROLES.ADMIN]), async (req, res) => {
  try {
    const rolesDao = new RolesDao();

    const rolesList = await rolesDao.getRoles();

    if (Array.isArray(rolesList) && rolesList.length === 0) {
      return res.status(204).send(); // No Operators saved
    }

    res.status(200).json(rolesList);

  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

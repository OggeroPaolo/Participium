import { Router } from "express";
import type { Request, Response} from "express";
import { query, validationResult } from "express-validator";
import RolesDao from "../dao/RolesDAO.js";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js";
import { ROLES, type RoleType } from "../models/userRoles.js";

const router = Router();

// GET /roles?type=tech_officer (optional type filter)
router.get("/roles",
  verifyFirebaseToken([ROLES.ADMIN]),
  [query("type").optional().isIn(Object.values(ROLES)).withMessage("Invalid role type"),],
  async (req: Request, res: Response) => {
    // Handle validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array()[0]?.msg;
      return res.status(400).json({ error: firstError });
    }

    try {
      const rolesDao = new RolesDao();
      const type = req.query.type as RoleType | undefined;

      const rolesList = await rolesDao.getRoles(type);

      if (!rolesList?.length) return res.status(204).send();

      res.status(200).json(rolesList);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

export default router;

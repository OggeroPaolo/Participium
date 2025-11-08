import { Router } from "express";
import OperatorDao from "../dao/OperatorDAO.js";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js";
import { ROLES } from "../models/userRoles.js";

const router = Router();

// Health check endpoint
router.get("/operators", verifyFirebaseToken([ROLES.ADMIN]), async (req, res) => {
  try {
    const operatorDao = new OperatorDao();

    const operatorsList = await operatorDao.getOperators();

    if (Array.isArray(operatorsList) && operatorsList.length === 0) {
      return res.status(204).send(); // No Operators saved
    }

    res.status(200).json(operatorsList);

  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

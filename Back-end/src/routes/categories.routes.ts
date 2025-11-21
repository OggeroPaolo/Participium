import { Router } from "express";
import CategoriesDao from "../dao/CategoriesDAO.js";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js";
import { ROLES } from "../models/userRoles.js";

const router = Router();

/**
 * GET /categories
 * Returns all categories
 */
router.get("/categories", verifyFirebaseToken([ROLES.ADMIN, ROLES.CITIZEN, ROLES.PUB_RELATIONS, ROLES.TECH_OFFICER]), async (req, res) => {
  try {
    const categoriesDao = new CategoriesDao();
    const categories = await categoriesDao.getCategories();

    if (Array.isArray(categories) && categories.length === 0) {
      return res.status(204).send(); // No Content
    }

    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;

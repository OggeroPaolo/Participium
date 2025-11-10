import { Router } from "express";
import userRoutes from "./user.routes.js";
import OperatorRoutes from "./operator.routes.js";
import registrationsRoutes from "./registrations.routes.js";
import rolesRoutes from "./roles.routes.js";

const router = Router();

// Mount route modules
router.use(userRoutes);
router.use(registrationsRoutes);
router.use(OperatorRoutes);
router.use(rolesRoutes);

export default router;

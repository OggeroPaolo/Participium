import { Router } from "express";
import healthRoutes from "./health.routes.js";
import OperatorRoutes from "./operator.routes.js";
import registrationsRoutes from "./registrations.routes.js";
import rolesRoutes from "./roles.routes.js";

const router = Router();

// Mount route modules
router.use(healthRoutes);
router.use(registrationsRoutes);
router.use(OperatorRoutes);
router.use(rolesRoutes);

export default router;

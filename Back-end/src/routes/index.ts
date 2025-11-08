import { Router } from "express";
import healthRoutes from "./health.routes.js";
import OperatorRoutes from "./operator.routes.js";
import registrationsRoutes from "./registrations.routes.js";

const router = Router();

// Mount route modules
router.use(healthRoutes);
router.use(registrationsRoutes);


router.use(OperatorRoutes);

export default router;

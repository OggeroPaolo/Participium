import { Router } from "express";
import healthRoutes from "./health.routes.js";
import OperatorRoutes from "./operator.routes.js";

const router = Router();

// Mount route modules
router.use(healthRoutes);

// Additional route modules will be added here as the project grows
// Example:
// import userRoutes from "./user.routes.js";
// router.use("/users", userRoutes);


router.use(OperatorRoutes);

export default router;

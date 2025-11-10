import express, { Router } from "express";

/**
 * Utility to create a minimal Express app instance for route testing.
 * Automatically enables JSON body parsing and mounts your router.
 */
export function makeTestApp(router: Router) {
  const app = express();
  app.use(express.json());
  app.use("/", router);
  return app;
}

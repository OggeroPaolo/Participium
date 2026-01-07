import http from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { initializeDatabase } from "./db/init.js";
import { closeDatabase } from "./config/database.js";
import { initializeRealtime } from "./realtime/realtimeGateway.js";

// Initialize database before starting server
await initializeDatabase();

const server = http.createServer(app);
initializeRealtime(server);

server.listen(env.PORT, () => {
  logger.info(`Server listening on http://localhost:${env.PORT}`);
});

const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down...`);
  server.close(async (err) => {
    if (err) {
      logger.error({ err }, "Error while closing server");
      await closeDatabase();
      process.exit(1);
    }
    logger.info("Server closed.");
    await closeDatabase();
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));


import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttpModule from "pino-http";

import routes from "./routes/index.js";
import { errorHandler, notFound } from "./middlewares/error.js";
import { logger } from "./config/logger.js";
import { env } from "./config/env.js";

const pinoHttp = pinoHttpModule as any;

export const app = express();

// Security & parsers
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

// Request logging
app.use(pinoHttp({ logger }));

// Routes
app.use("/", routes);

// 404 + error handling
app.use(notFound);
app.use(errorHandler);

export default app;


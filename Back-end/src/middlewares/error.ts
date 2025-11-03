import type { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger.js";
/*
    Note: When using TypeScript with Node.js and ECMAScript modules,
    you should use the `.js` extension in import paths, even in `.ts` files.
    This is required for compatibility with `--moduleResolution node16` or `nodenext`.
*/
export class AppError extends Error {
  statusCode: number;
  code?: string | undefined;
  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const notFound = (req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const isAppError = err instanceof AppError;
  const status = isAppError ? err.statusCode : 500;
  const message = isAppError ? err.message : "Internal Server Error";

  if (!isAppError || status >= 500) {
    logger.error({ err }, "Unhandled error");
  }

  res.status(status).json({
    success: false,
    message,
    code: isAppError ? err.code : undefined,
  });
};


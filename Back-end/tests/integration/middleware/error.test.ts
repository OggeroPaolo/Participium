
import request from "supertest";
import express from "express";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { notFound, errorHandler, AppError } from "../../../src/middlewares/error.js";
import { logger } from "../../../src/config/logger.js";

describe("Error handling middleware", () => {
  let app: ReturnType<typeof express>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  it("should call next with AppError for notFound middleware", () => {
    const req = { method: "GET", originalUrl: "/non-existent" } as any;
    const next = vi.fn();

    notFound(req, {} as any, next);

    expect(next).toHaveBeenCalled();
    const calledError = next.mock.calls[0][0];
    expect(calledError).toBeInstanceOf(AppError);
    expect(calledError.message).toBe("Route GET /non-existent not found");
    expect(calledError.statusCode).toBe(404);
  });

  it("should respond with AppError status and message", async () => {
    // Route that throws an AppError
    app.get("/app-error", (_req, _res, next) => {
      next(new AppError("Custom AppError", 400, "BAD_REQUEST"));
    });

    app.use(errorHandler);

    const res = await request(app).get("/app-error");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "Custom AppError",
      code: "BAD_REQUEST",
    });
  });

  it("should respond with 500 and log unknown errors", async () => {
    // Mock logger.error
    const loggerMock = vi.spyOn(logger, "error").mockImplementation(() => {});

    // Route that throws a standard Error
    app.get("/unknown-error", (_req, _res, next) => {
      next(new Error("Unexpected error"));
    });

    app.use(errorHandler);

    const res = await request(app).get("/unknown-error");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: "Internal Server Error",
      code: undefined,
    });

    expect(loggerMock).toHaveBeenCalled();

    loggerMock.mockRestore();
  });
});

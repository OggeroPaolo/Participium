import { describe, it, expect, vi } from "vitest";
import { validateCreateReport, validateGetReport, validateOfficersGetReports } from "../../../src/middlewares/reportValidation.js";

describe("validateReport Test", () => {
  describe("validateCreateReport middleware", () => {
    const createMockReqResNext = (body = {}, files: any) => {
      const req: any = { body, files };
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();
      return { req, res, next };
    };

    it("should call next() for valid input (files as array)", async () => {
      const { req, res, next } = createMockReqResNext({
        user_id: 1,
        category_id: 2,
        title: "Test",
        description: "Test desc",
        position_lat: 40.0,
        position_lng: -70.0,
        is_anonymous: true,
      }, [{}]); // at least 1 photo

      for (const middleware of validateCreateReport) {
        await middleware(req, res, next);
      }

      expect(next).toHaveBeenCalled();
    });

    it("should call next() for valid input (files as single object)", async () => {
      const { req, res, next } = createMockReqResNext({
        user_id: 1,
        category_id: 2,
        title: "Test",
        description: "Test desc",
        position_lat: 40.0,
        position_lng: -70.0,
        is_anonymous: true,
      }, {}); // single object, not array

      for (const middleware of validateCreateReport) {
        await middleware(req, res, next);
      }

      expect(next).toHaveBeenCalled();
    });

    it("should return 400 if no photos are uploaded", async () => {
      const { req, res, next } = createMockReqResNext({
        user_id: 1,
        category_id: 2,
        title: "Test",
        description: "Test desc",
        position_lat: 40.0,
        position_lng: -70.0,
        is_anonymous: true,
      }, []);

      for (const middleware of validateCreateReport) {
        await middleware(req, res, next);
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: [{ msg: "At least one photo is required", param: "photos" }]
      });
    });

    it("should return 400 if more than 3 photos are uploaded", async () => {
      const files = [{}, {}, {}, {}];
      const { req, res, next } = createMockReqResNext({
        user_id: 1,
        category_id: 2,
        title: "Test",
        description: "Test desc",
        position_lat: 40.0,
        position_lng: -70.0,
        is_anonymous: true,
      }, files);

      for (const middleware of validateCreateReport) {
        await middleware(req, res, next);
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: [{ msg: "A maximum of 3 photos can be uploaded", param: "photos" }]
      });
    });

    it("should return 400 if any body field is invalid", async () => {
      const { req, res, next } = createMockReqResNext({
        user_id: "abc", // invalid
        category_id: 2,
        title: "",
        description: "Test desc",
        position_lat: "abc",
        position_lng: -70.0,
        is_anonymous: "yes",
      }, [{}]);

      for (const middleware of validateCreateReport) {
        await middleware(req, res, next);
      }

      expect(res.status).toHaveBeenCalledWith(400);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.errors.length).toBeGreaterThan(0);
    });
  });


  describe("validateOfficersGetReports middleware", () => {
    const createMockReqResNext = (officerId: any) => {
      const req: any = { params: { officerId } };
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();
      return { req, res, next };
    };

    it("should call next() for valid officerId", async () => {
      const { req, res, next } = createMockReqResNext(123);

      for (const middleware of validateOfficersGetReports) {
        await middleware(req, res, next);
      }

      expect(next).toHaveBeenCalled();
    });

    it("should return 400 for invalid officerId", async () => {
      const { req, res, next } = createMockReqResNext("abc");

      for (const middleware of validateOfficersGetReports) {
        await middleware(req, res, next);
      }

      expect(res.status).toHaveBeenCalledWith(400);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.errors[0].msg).toBe("officerId must be a valid integer");
    });
  });

  describe("validateGetReport middleware", () => {
    const createMockReqResNext = (reportId: any) => {
      const req: any = { params: { reportId } };
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();
      return { req, res, next };
    };

    it("should call next() for valid reportId", async () => {
      const { req, res, next } = createMockReqResNext(123);

      for (const middleware of validateGetReport) {
        await middleware(req, res, next);
      }

      expect(next).toHaveBeenCalled();
    });

    it("should return 400 for invalid reportId", async () => {
      const { req, res, next } = createMockReqResNext("abc");

      for (const middleware of validateGetReport) {
        await middleware(req, res, next);
      }

      expect(res.status).toHaveBeenCalledWith(400);
      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.errors[0].msg).toBe("reportId must be a valid integer");
    });
  });
});
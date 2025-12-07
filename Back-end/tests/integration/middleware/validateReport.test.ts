import { describe, it, expect, vi } from "vitest";
import {
  validateCreateReport,
  validateGetReports,
  validateOfficersGetReports,
  validateAssignExternalMaintainer,
  validateExternalMaintainerUpdateStatus
} from "../../../src/middlewares/reportValidation.js";

describe("Report Validation Middleware Tests", () => {

  // Helper to mock req/res/next
  const createMockReqResNext = (opts: any = {}) => {
    const req: any = opts.req || {};
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    return { req, res, next };
  };

  // ----------------- validateCreateReport -----------------
  describe("validateCreateReport", () => {

    it("calls next() with valid input and files", async () => {
      const { req, res, next } = createMockReqResNext({
        req: {
          body: {
            user_id: 1,
            category_id: 2,
            title: "Test",
            description: "Desc",
            position_lat: 40.0,
            position_lng: -70.0,
            is_anonymous: true,
          },
          files: [{}]
        }
      });

      for (const middleware of validateCreateReport) await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("returns 400 if no photos are uploaded", async () => {
      const { req, res, next } = createMockReqResNext({
        req: { body: { category_id: 1, title: "T", description: "D", position_lat: 0, position_lng: 0, is_anonymous: true }, files: [] }
      });

      for (const middleware of validateCreateReport) await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ errors: [{ msg: "At least one photo is required", param: "photos" }] });
    });

    it("returns 400 if more than 3 photos uploaded", async () => {
      const { req, res, next } = createMockReqResNext({
        req: { body: { category_id: 1, title: "T", description: "D", position_lat: 0, position_lng: 0, is_anonymous: true }, files: [{}, {}, {}, {}] }
      });

      for (const middleware of validateCreateReport) await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ errors: [{ msg: "A maximum of 3 photos can be uploaded", param: "photos" }] });
    });

    it("returns 400 if req.files is not an array (fallback to empty array)", async () => {
      const { req, res, next } = createMockReqResNext({
        req: {
          body: {
            category_id: 1,
            title: "T",
            description: "D",
            position_lat: 0,
            position_lng: 0,
            is_anonymous: true,
          },
          files: {}, // ❌ not an array → should become []
        }
      });

      for (const middleware of validateCreateReport) {
        await middleware(req, res, next);
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: [{ msg: "At least one photo is required", param: "photos" }]
      });
    });

  });

  // ----------------- validateOfficersGetReports -----------------
  describe("validateOfficersGetReports", () => {

    it("calls next() with valid officerId", async () => {
      const { req, res, next } = createMockReqResNext({ req: { params: { officerId: 123 } } });
      for (const middleware of validateOfficersGetReports) await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("returns 400 with invalid officerId", async () => {
      const { req, res, next } = createMockReqResNext({ req: { params: { officerId: "abc" } } });
      for (const middleware of validateOfficersGetReports) await middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].errors[0].msg).toBe("officerId must be a valid integer");
    });
  });

  // ----------------- validateGetReports -----------------
  describe("validateGetReports", () => {

    it("calls next() with valid status query", async () => {
      const { req, res, next } = createMockReqResNext({ req: { query: { status: "in_progress" } } });
      for (const middleware of validateGetReports) await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("returns 400 with invalid status query", async () => {
      const { req, res, next } = createMockReqResNext({ req: { query: { status: "invalid_status" } } });
      for (const middleware of validateGetReports) await middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toBe("Invalid status filter: invalid_status");
    });
  });

  // ----------------- validateAssignExternalMaintainer -----------------
  describe("validateAssignExternalMaintainer", () => {

    it("calls next() with valid input", async () => {
      const { req, res, next } = createMockReqResNext({ req: { params: { reportId: 1 }, body: { externalMaintainerId: 5 } } });
      for (const middleware of validateAssignExternalMaintainer) await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("returns 400 with invalid input", async () => {
      const { req, res, next } = createMockReqResNext({ req: { params: { reportId: "abc" }, body: { externalMaintainerId: "xyz" } } });
      for (const middleware of validateAssignExternalMaintainer) await middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].errors.length).toBeGreaterThan(0);
    });
  });

  // ----------------- validateExternalMaintainerUpdateStatus -----------------
  describe("validateExternalMaintainerUpdateStatus", () => {

    it("calls next() with valid input", async () => {
      const { req, res, next } = createMockReqResNext({ req: { params: { reportId: 1 }, body: { status: "resolved" } } });
      for (const middleware of validateExternalMaintainerUpdateStatus) await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("returns 400 with invalid status", async () => {
      const { req, res, next } = createMockReqResNext({ req: { params: { reportId: 1 }, body: { status: "invalid" } } });
      for (const middleware of validateExternalMaintainerUpdateStatus) await middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].errors[0].msg).toContain("Status must be one of");
    });
  });
});

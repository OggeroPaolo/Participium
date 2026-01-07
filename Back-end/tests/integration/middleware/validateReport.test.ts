import { describe, it, expect, vi } from "vitest";
import {
  validateCreateComment,
  validateCreateReport,
  validateReportId,
  validateGetReports,
  validateAssignExternalMaintainer,
  validateUpdateStatus
} from "../../../src/middlewares/reportValidation.js";

// Helper to mock req/res/next
const createMockReqResNext = (opts: any = {}) => {
  const req: any = opts.req || {};
  const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  return { req, res, next };
};

describe("Report Validation Middleware Tests", () => {

  // ----------------- validateCreateComment -----------------
  describe("validateCreateComment", () => {
    it("calls next() with valid input", async () => {
      const { req, res, next } = createMockReqResNext({
        req: { params: { reportId: 1 }, body: { type: "note", text: "Hello" } }
      });

      for (const middleware of validateCreateComment) {
        await middleware(req, res, next);
      }

      expect(next).toHaveBeenCalled();
    });

    it("returns 400 with missing fields", async () => {
      const { req, res, next } = createMockReqResNext({
        req: { params: { reportId: "abc" }, body: { type: "", text: "" } }
      });

      for (const middleware of validateCreateComment) {
        await middleware(req, res, next);
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].errors.length).toBeGreaterThan(0);
    });
  });

  // ----------------- validateCreateReport -----------------
  describe("validateCreateReport", () => {

    it("calls next() with valid input and files", async () => {
      const { req, res, next } = createMockReqResNext({
        req: {
          body: {
            category_id: 1,
            title: "Test",
            description: "Desc",
            position_lat: 1.1,
            position_lng: 2.2,
            is_anonymous: true
          },
          files: [{}]
        }
      });

      for (const middleware of validateCreateReport) await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("returns 400 if no photos are uploaded", async () => {
      const { req, res, next } = createMockReqResNext({
        req: { body: {}, files: [] }
      });

      for (const middleware of validateCreateReport) await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: [{ msg: "At least one photo is required", param: "photos" }]
      });
    });

    it("returns 400 if more than 3 photos uploaded", async () => {
      const { req, res, next } = createMockReqResNext({
        req: { body: {}, files: [{}, {}, {}, {}] }
      });

      for (const middleware of validateCreateReport) await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: [{ msg: "A maximum of 3 photos can be uploaded", param: "photos" }]
      });
    });

    it("returns 400 if req.files is not an array", async () => {
      const { req, res, next } = createMockReqResNext({
        req: { body: {}, files: {} }
      });

      for (const middleware of validateCreateReport) await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: [{ msg: "At least one photo is required", param: "photos" }]
      });
    });
  });

  // ----------------- validateReportId -----------------
  describe("validateReportId", () => {
    it("calls next() for valid reportId", async () => {
      const { req, res, next } = createMockReqResNext({
        req: { params: { reportId: 10 } }
      });

      for (const middleware of validateReportId) await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("returns 400 for invalid reportId", async () => {
      const { req, res, next } = createMockReqResNext({
        req: { params: { reportId: "abc" } }
      });

      for (const middleware of validateReportId) await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].errors[0].msg).toBe("reportId must be a valid integer");
    });
  });

  // ----------------- validateGetReports -----------------
  describe("validateGetReports", () => {
    it("calls next() with valid status", async () => {
      const { req, res, next } = createMockReqResNext({
        req: { query: { status: "in_progress" } }
      });

      for (const middleware of validateGetReports) await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("returns 400 for invalid status", async () => {
      const { req, res, next } = createMockReqResNext({
        req: { query: { status: "wrong_status" } }
      });

      for (const middleware of validateGetReports) await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].error).toBe("Invalid status filter: wrong_status");
    });
  });

  // ----------------- validateAssignExternalMaintainer -----------------
  describe("validateAssignExternalMaintainer", () => {
    it("calls next() with valid data", async () => {
      const { req, res, next } = createMockReqResNext({
        req: { params: { reportId: 1 }, body: { externalMaintainerId: 2 } }
      });

      for (const middleware of validateAssignExternalMaintainer) await middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("returns 400 with invalid values", async () => {
      const { req, res, next } = createMockReqResNext({
        req: { params: { reportId: "abc" }, body: { externalMaintainerId: "xyz" } }
      });

      for (const middleware of validateAssignExternalMaintainer) await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].errors.length).toBeGreaterThan(0);
    });
  });

  // ----------------- validateExternalMaintainerUpdateStatus -----------------
  describe("validateExternalMaintainerUpdateStatus", () => {
    it("calls next() with valid input", async () => {
      const { req, res, next } = createMockReqResNext({
        req: { params: { reportId: 1 }, body: { status: "resolved" } }
      });

      for (const middleware of validateUpdateStatus) await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("returns 400 for invalid status", async () => {
      const { req, res, next } = createMockReqResNext({
        req: { params: { reportId: 1 }, body: { status: "wrong" } }
      });

      for (const middleware of validateUpdateStatus) await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].errors[0].msg).toContain("Status must be one of");
    });
  });
});

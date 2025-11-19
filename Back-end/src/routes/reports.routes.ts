import { Router } from "express";
import type { Request, Response } from "express";
import { body, param, validationResult } from "express-validator";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js";
import ReportDAO from "../dao/ReportDAO.js";
import { ROLES } from "../models/userRoles.js";
import type { User } from "../models/user.js"

const router = Router();
const reportDAO = new ReportDAO();

// Patches the status of a report optionally attaching a rejection note
router.patch("/reports/:reportId/status",
  [
    param("reportId").isInt().withMessage("Report ID must be a valid integer"),

    body("status").isIn(["pending_approval", "assigned", "in_progress", "suspended", "rejected", "resolved"])
    .withMessage("Status must be one of: pending_approval, assigned, in_progress, suspended, rejected, resolved"),

    body("note").if(body("status").equals("rejected")).notEmpty()
      .withMessage("A note is required when report is rejected"),
  ],
  verifyFirebaseToken([ROLES.OPERATOR]),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const extractedErrors = errors.array().map(err => err.msg);
      return res.status(400).json({ errors: extractedErrors });
    }

    try {
      const { status, note } = req.body;
      const reportId = Number(req.params.reportId);
      const user = (req as Request & { user: User }).user;

      await reportDAO.updateReportStatus(reportId, status, user.id,note);

      return res.status(200).json({
        message: "Report status updated succesfully"
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);


export default router;

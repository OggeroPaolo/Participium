import { Router } from "express";
import type { Request, Response } from "express";
import { body, param, validationResult } from "express-validator";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js";
import ReportDAO, { CategoryNotFoundError, ReportNotFoundError } from "../dao/ReportDAO.js";
import OperatorDAO from "../dao/OperatorDAO.js";
import { ROLES } from "../models/userRoles.js";
import type { User } from "../models/user.js"


const router = Router();
const reportDAO = new ReportDAO();
const operatorDAO = new OperatorDAO();

// Patches the status of a report optionally attaching a rejection note
router.patch("/reports/:reportId",
  [
    param("reportId").isInt().withMessage("Report ID must be a valid integer"),

    body("status").isIn(["pending_approval", "assigned", "in_progress", "suspended", "rejected", "resolved"])
      .withMessage("Status must be one of: pending_approval, assigned, in_progress, suspended, rejected, resolved"),

    body("note").if(body("status").equals("rejected")).notEmpty()
      .withMessage("A note is required when report is rejected"),
    body("categoryId").optional({ nullable: true }).isInt().withMessage("categoryId must be an integer if passed")
  ],
  verifyFirebaseToken([ROLES.OPERATOR]),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: "Invalid request data" });
    }

    try {
      let { status, note, categoryId } = req.body;

      //if status to be changed is not rejected or resolved set note to null so it won't be changed in the sql query (note is required for rejection and optional for resolved)  
      if (status === "rejected" || status === "resolved") {
        note = note? note : null;
      } else {
        note = null;
      }

      // category is always optional (probably not needed to set it to null but i dont know)
      // categoryId = categoryId? categoryId : null;
      const reportId = Number(req.params.reportId);
      const user = (req as Request & { user: User }).user;

      // get report info to check the current status
      const report = await reportDAO.getReportById(reportId);
      if (!report) return res.status(404).json({ error: "Report not found" });

      const currentStatus = report.status;
      const categoryIdFinal = categoryId? categoryId : report.category_id;

      // if operator is a public relations officer he can only modify if current status is pending_approval and to be status is assigned or rejected
      const userRole = user.role_name;
      if (userRole === "Municipal_public_relations_officer" && (currentStatus !== "pending_approval" || (status !== "assigned" && status !== "rejected"))) {
        return res.status(403).json({
          error: `You are not allowed to change status from ${currentStatus} to ${status}`
        });
      }

      // if opperator is a technical officer then he can only change a report if it is in the status ["assigned", "in_progress", "suspended"] and he can only change it to ["resolved", "in_progress", "suspended"]
      /*****************************************************************************************
       * TO DO: check if the officer modifying the status is the one the report is assigned to *
       *****************************************************************************************/
      if (userRole !== "Municipal_public_relations_officer" && (!["assigned", "in_progress", "suspended"].includes(currentStatus) || !["resolved", "in_progress", "suspended"].includes(status))) {
        return res.status(403).json({
          error: `You are not allowed to change status from ${currentStatus} to ${status}`
        });
      }

      /*******************************************************************************************************************************************
       * TO DO: set categoryId to null if userRole !== "Municipal_public_relations_officer" since a technical officer cannot modify the category *
       *******************************************************************************************************************************************/

      // if status to be is assigned get the operator of the corresponding category that has the least assigned reports 
      // (maybe should change it to include in the number not only assigned reports, but also in_progress reports)
      let assigneeId;
      if (status === "assigned") {
        assigneeId = await operatorDAO.getAssigneeId(categoryIdFinal);
      }

      // update the report and optionally assigne it if to be status is assigned
      await reportDAO.updateReportStatusAndAssign(reportId, status, user.id, note, categoryId, assigneeId);

      return res.status(200).json({
        message: "Report status updated successfully"
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
);

export default router;

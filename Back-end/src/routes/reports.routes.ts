import { Router, type Request, type Response } from "express";
import { body, param, validationResult } from "express-validator";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js";
import ReportDAO from "../dao/ReportDAO.js";
import mapToDTO, { type ReportMapDTO } from "../dto/ReportMapDTO.js";
import type { ReportMap } from "../models/reportMap.js";
import OperatorDAO from "../dao/OperatorDAO.js";
import { ROLES } from "../models/userRoles.js";
import type { User } from "../models/user.js"

const router = Router();
const reportDAO = new ReportDAO();
const operatorDAO = new OperatorDAO();

//GET /reports/map
router.get("/reports/map",
    async (rec: Request, res: Response) => {
        try {
            const rawReports: ReportMap[] = await reportDAO.getMapReports();
            const reports: ReportMapDTO[] = rawReports.map(mapToDTO);
            
            if (Array.isArray(reports) && reports.length === 0) {
                return res.status(204).send();
            }
            
            return res.status(200)
                .json({ reports });
        } catch (error: any) {
            console.error(error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

// Patches the status of a report optionally attaching a rejection note
router.patch("/pub_relations/reports/:reportId",
  [
    param("reportId").isInt().withMessage("Report ID must be a valid integer"),

    body("status").isIn(["assigned", "rejected"])
      .withMessage("Status must be one of: assigned, rejected"),

    body("note").if(body("status").equals("rejected")).notEmpty()
      .withMessage("A note is required when report is rejected"),
    body("categoryId").optional({ nullable: true }).isInt().withMessage("categoryId must be an integer if passed")
  ],
  verifyFirebaseToken([ROLES.PUB_RELATIONS]),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors)
      return res.status(400).json({ errors: "Invalid request data" });
    }

    try {
      let { status, note, categoryId } = req.body;

      // //if status to be changed is not rejected set note to null so it won't be changed in the sql query
      if (status === "rejected") {
        note = note ? note : null;
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
      const categoryIdFinal = categoryId ? categoryId : report.category_id;

      // A public relations officer can only modify if the current status is pending_approval
      const userRole = user.role_name;
      if (currentStatus !== "pending_approval") {
        return res.status(403).json({
          error: `You are not allowed to change status of a form which is not in the pending_approval status`
        });
      }

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

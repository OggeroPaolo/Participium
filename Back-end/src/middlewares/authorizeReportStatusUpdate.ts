import type { Request, Response, NextFunction } from "express";
import { ReportStatus } from "../models/reportStatus.js";
import ReportDAO from "../dao/ReportDAO.js";

const reportDAO = new ReportDAO();

export const authorizeReportStatusUpdate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const reportId = Number(req.params.reportId);

        const report = await reportDAO.getReportById(reportId);
        if (!report) {
            return res.status(404).json({ error: "Report not found" });
        }

        const allowedStatuses = [
            ReportStatus.Assigned,
            ReportStatus.InProgress,
            ReportStatus.Suspended
        ];

        if (!allowedStatuses.includes(report.status)) {
            return res.status(403).json({
                error: `You are not allowed to change status of a report not in ${allowedStatuses.join('/')} state`
            });
        }

        req.authorizedReport = report;
        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
};

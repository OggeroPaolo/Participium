import { Router, type Request, type Response } from "express";
import ReportDAO from "../dao/ReportDAO.js";
import mapToDTO, { type ReportMapDTO } from "../dto/ReportMapDTO.js";
import type { ReportMap } from "../models/reportMap.js";

const router = Router();
const reportDAO = new ReportDAO();

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


export default router;
import { Router } from "express";
import ReportDAO from "../dao/ReportDAO.js";

const router = Router();
const reportDAO = new ReportDAO();

export default router;
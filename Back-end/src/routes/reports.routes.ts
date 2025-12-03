import { Router, type Request, type Response } from "express";
import { body, param, validationResult } from "express-validator";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js";
import ReportDAO from "../dao/ReportDAO.js";
import mapToDTO, { type ReportMapDTO } from "../dto/ReportMapDTO.js";
import { type CreateReportDTO } from "../dto/CreateReportDTO.js";
import type { ReportMap } from "../models/reportMap.js";
import OperatorDAO from "../dao/OperatorDAO.js";
import { ROLES } from "../models/userRoles.js";
import type { User } from "../models/user.js"
import { validateCreateReport, validateGetReport, validateGetReports, validateOfficersGetReports } from "../middlewares/reportValidation.js";
import { upload } from "../config/multer.js";
import cloudinary from "../config/cloudinary.js";
import { unlink, rename } from "fs/promises";
import path from 'path';
import sharp from 'sharp';
import type { ReportFilters } from "../dao/ReportDAO.js";
import { ReportStatus } from "../models/reportStatus.js";

const router = Router();
const reportDAO = new ReportDAO();
const operatorDAO = new OperatorDAO();

//GET /reports/map
router.get("/reports/map/accepted",
    async (req: Request, res: Response) => {
        try {
            const rawReports: ReportMap[] = await reportDAO.getAcceptedReportsForMap();
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

//GET /reports/:reportId
router.get("/reports/:reportId",
    verifyFirebaseToken([ROLES.CITIZEN, ROLES.PUB_RELATIONS, ROLES.TECH_OFFICER]),
    validateGetReport,
    async (req: Request, res: Response) => {
        try {
            const reportId = Number(req.params.reportId);
            const report = await reportDAO.getCompleteReportById(reportId);

            return res.status(200).json({ report });

        } catch (error: any) {
            if (error instanceof Error && error.message === "Report not found") {
                return res.status(404).json({ error: "Report not found" });
            }
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

//GET /officers/:officerId/reports
router.get("/officers/:officerId/reports",
    verifyFirebaseToken([ROLES.TECH_OFFICER]),
    validateOfficersGetReports,
    async (req: Request, res: Response) => {
        try {
            //TODO: Verification on params
            const officerId = Number(req.params.officerId);
            const filters: ReportFilters = { officerId: officerId };

            const reports = await reportDAO.getReportsByFilters(filters);

            if (Array.isArray(reports) && reports.length === 0) {
                return res.status(204).send();
            }

            return res.status(200).json({ reports });


        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

//GET /reports?status=pending_approval
router.get("/reports",
    verifyFirebaseToken([ROLES.PUB_RELATIONS]),
    validateGetReports,
    async (req: Request, res: Response) => {
        try {
            const status = req.query.status as string | undefined;

            if (status && !Object.values(ReportStatus).includes(status as ReportStatus)) {
                return res.status(400).json({ error: "Invalid status filter" });
            }

            const filters: ReportFilters = {};
            if (status) {
                filters.status = status;
            }
            const reports = await reportDAO.getReportsByFilters(filters);

            if (Array.isArray(reports) && reports.length === 0) {
                return res.status(204).send();
            }

            return res.status(200).json({ reports });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
)

//POST /reports
router.post("/reports",
    verifyFirebaseToken([ROLES.CITIZEN]),
    upload.array('photos', 3),
    validateCreateReport,
    async (req: Request, res: Response) => {
        const uploadedUrls: string[] = [];

        try {
            const files = req.files as Express.Multer.File[];
            if (!files || files.length === 0) {
                console.log(files)
                return res.status(400).json({ error: "At least one photo is required" });
            }

            for (const file of files) {
                const newPath = file.path + path.extname(file.originalname); // add extension

                await sharp(file.path)
                    .resize(1200, 1200, {   // 1200 max height or width
                        fit: 'inside',   // Keep original aspect ration
                        withoutEnlargement: true // Don't enlarge smaller pictures
                    })
                    .toFile(newPath);

                const result = await cloudinary.uploader.upload(newPath, {
                    folder: 'Participium',
                    resource_type: 'raw',
                });

                // URL con trasformazione richiesta
                const url = result.secure_url
                uploadedUrls.push(url);

                // Elimina file temporaneo locale
                await unlink(file.path);
                await unlink(newPath);
            }

            const user = (req as Request & { user: User }).user;

            const data: CreateReportDTO = {
                user_id: Number(user.id),
                category_id: Number(req.body.category_id),
                title: req.body.title,
                description: req.body.description,
                is_anonymous: req.body.is_anonymous === 'true' || req.body.is_anonymous === true,
                position_lat: Number(req.body.position_lat),
                position_lng: Number(req.body.position_lng),
                photos: uploadedUrls
            };
            const createdReport = await reportDAO.createReport(data);

            return res.status(201).json({ report: createdReport });

        }
        catch (error) {
            for (const url of uploadedUrls) {
                try {
                    // Extract everything after /upload/v123/ and before the extension
                    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.([a-zA-Z0-9]+)$/);
                    let publicId = matches ? matches[1] : null;
                    const ext = matches ? matches[2] : null; // capture the extension

                    if (publicId && ext) {
                        // Append the original extension back
                        publicId = `${publicId}.${ext}`;

                        await cloudinary.uploader.destroy(publicId, {
                            resource_type: "raw"
                        });
                    }
                } catch (delErr) {
                    console.error("Error deleting image during rollback:", delErr);
                }
            }

            console.log(error);
            return res.status(500).json({ error: "Internal server error" });
        }


    });

// Patches the status of a report optionally attaching a rejection note
router.patch("/pub_relations/reports/:reportId",
    [
        param("reportId").isInt().withMessage("Report ID must be a valid integer"),

        body("status").isIn(["assigned", "rejected"])
            .withMessage("Status must be one of: assigned, rejected"),

        body("note").if(body("status").equals("rejected")).notEmpty()
            .withMessage("A note is required when report is rejected"),
        body("categoryId").optional({ nullable: true }).isInt().withMessage("categoryId must be an integer if passed"),
        body("officerId").optional({ nullable: true }).isInt().withMessage("officerId must be an integer if passed")
    ],
    // verifyFirebaseToken([ROLES.PUB_RELATIONS]),
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            //Extract the validation error messages 
            const extractedErrors = errors.array().map(err => err.msg);
            return res.status(400).json({ errors: extractedErrors });
        }


        try {
            let { status, note, categoryId, officerId } = req.body;

            // if status to be changed is not rejected set note to null so it won't be changed in the sql query
            if (status != "rejected") {
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
            if (currentStatus !== "pending_approval") {
                return res.status(403).json({
                    error: `You are not allowed to change status of a form which is not in the pending approval status`
                });
            }

            // if status to be is assigned get the operator of the corresponding category that has the least assigned reports 
            // (maybe should change it to include in the number not only assigned reports, but also in_progress reports)
            let assigneeId = undefined;
            if (status === "assigned" && !officerId) {
                assigneeId = await operatorDAO.getAssigneeId(categoryIdFinal);
            }
            if (status === "assigned" && officerId) {
                const officerCategoryId = await operatorDAO.getCategoryOfOfficer(officerId);
                if (officerCategoryId === categoryIdFinal) {
                    assigneeId = officerId
                } else {
                    return res.status(403).json({
                        error: `The officer you want to assign to this report does not handle this category`
                    });
                }
            }

            // update the report and optionally assigne it if to be status is assigned
            await reportDAO.updateReportStatusAndAssign(reportId, status, 2, note, categoryId, assigneeId);

            return res.status(200).json({
                message: "Report status updated successfully"
            });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
);

export default router;

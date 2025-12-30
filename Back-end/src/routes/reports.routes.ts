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
import { validateAssignExternalMaintainer, validateCreateReport, validateExternalMaintainerUpdateStatus, validateReportId, validateGetReports, validateCreateComment } from "../middlewares/reportValidation.js";
import { upload } from "../config/multer.js";
import cloudinary from "../config/cloudinary.js";
import { unlink } from "node:fs/promises";
import path from 'node:path';
import sharp from 'sharp';
import type { ReportFilters } from "../dao/ReportDAO.js";
import { ReportStatus } from "../models/reportStatus.js";

import UserDAO from "../dao/UserDAO.js";
import { getRealtimeGateway } from "../realtime/realtimeGateway.js";
import { logger } from "../config/logger.js";

import CommentDAO from "../dao/CommentDAO.js";
import type { CreateCommentDTO } from "../dto/CommentDTO.js";

import NotificationDAO from "../dao/NotificationDAO.js";
import type { CreateNotificationDTO } from "../dto/NotificationDTO.js";


const router = Router();
const reportDAO = new ReportDAO();
const operatorDAO = new OperatorDAO();

const userDAO = new UserDAO();

const commentDAO = new CommentDAO();

const notificationDAO = new NotificationDAO();

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
    validateReportId,
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

//GET /ext_maintainer/reports
router.get("/ext_maintainer/reports",
    verifyFirebaseToken([ROLES.EXT_MAINTAINER]),
    async (req: Request, res: Response) => {
        try {
            const user = (req as Request & { user: User }).user;
            const filters: ReportFilters = { externalUser: user.id };

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

//GET /tech_officer/reports
router.get("/tech_officer/reports",
    verifyFirebaseToken([ROLES.TECH_OFFICER]),
    async (req: Request, res: Response) => {
        try {
            const user = (req as Request & { user: User }).user;
            const filters: ReportFilters = { officerId: user.id };

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
            const status = req.query.status as string;

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

//POST /reports/:reportId/internal-comments
router.post("/reports/:reportId/internal-comments",
    validateCreateComment,
    verifyFirebaseToken([ROLES.TECH_OFFICER, ROLES.EXT_MAINTAINER]),
    async (req: Request, res: Response) => {
        try {
            const user = (req as Request & { user: User }).user;

            const data: CreateCommentDTO = {
                user_id: Number(user.id),
                report_id: Number(req.params.reportId),
                type: "private",
                text: req.body.text
            };
            const createdComment = await commentDAO.createComment(data);

            const report = await reportDAO.getReportById(Number(req.params.reportId));

            const recipientId = user.role_type === ROLES.TECH_OFFICER ? report?.external_user : report?.assigned_to;

            if (recipientId != null) {
                const notification: CreateNotificationDTO = {
                    user_id: recipientId,
                    report_id: Number(req.params.reportId),
                    comment_id: createdComment.id,
                    type: 'comment_on_assigned_report',
                    title: 'A new comment has arrived',
                };

                await notificationDAO.createNotification(notification);
            }

            return res.status(201).json({ comment: createdComment });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

//POST /reports/:reportId/external-comments
router.post("/reports/:reportId/external-comments",
    validateCreateComment,
    verifyFirebaseToken([ROLES.TECH_OFFICER, ROLES.CITIZEN]),
    async (req: Request, res: Response) => {
        try {
            const user = (req as Request & { user: User }).user;

            const data: CreateCommentDTO = {
                user_id: Number(user.id),
                report_id: Number(req.params.reportId),
                type: "public",
                text: req.body.text
            };
            const createdComment = await commentDAO.createComment(data);

            const report = await reportDAO.getReportById(Number(req.params.reportId));

            const recipientId = user.role_type === ROLES.TECH_OFFICER ? report?.user_id : report?.assigned_to;

            if (recipientId != null) {
                const notification: CreateNotificationDTO = {
                    user_id: recipientId,
                    report_id: Number(req.params.reportId),
                    comment_id: createdComment.id,
                    type: 'comment_on_created_report',
                    title: 'A new comment has arrived',
                };
            
                await notificationDAO.createNotification(notification);
            }

            return res.status(201).json({ comment: createdComment });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

//POST /reports
router.post("/reports",
    verifyFirebaseToken([ROLES.CITIZEN]),
    upload.array('photos', 3),
    validateCreateReport,
    async (req: Request, res: Response) => {
        const uploadedUrls: string[] = [];

        try {
            const files = req.files as Express.Multer.File[];

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
                address: req.body.address,
                position_lat: Number(req.body.position_lat),
                position_lng: Number(req.body.position_lng),
                photos: uploadedUrls
            };
            const createdReport = await reportDAO.createReport(data);

            return res.status(201).json({ report: createdReport });

        }
        catch (error) {
            console.log(error);
            for (const url of uploadedUrls) {
                await rollbackCloundinaryImages(url)
            }
            return res.status(500).json({ error: "Internal server error" });
        }
    });

async function rollbackCloundinaryImages(url: string) {
    try {
        // Extract everything after /upload/v123/ and before the extension
        const matches = new RegExp(/\/upload\/(?:v\d+\/)?(.+?)\.([a-zA-Z0-9]+)$/).exec(url);
        let publicId = matches ? matches[1] : null;
        const ext = matches ? matches[2] : null; // capture the extension

        if (publicId && ext) {
            // Append the original extension back
            publicId = `${publicId}.${ext}`;

            await cloudinary.uploader.destroy(publicId, {
                resource_type: "raw"
            });
        }
    } catch (error_) {
        console.error("Error deleting image during rollback:", error_);
    }

}

// Patches the external_user field of a report in order to assign it to the correct external mantainer
router.patch("/tech_officer/reports/:reportId/assign_external",
    validateAssignExternalMaintainer,
    verifyFirebaseToken([ROLES.TECH_OFFICER]),
    async (req: Request, res: Response) => {
        try {

            const reportId = Number(req.params.reportId);
            const user = (req as Request & { user: User }).user;
            let { externalMaintainerId } = req.body

            // get report info to check the current status
            const report = await reportDAO.getReportById(reportId);
            if (!report) return res.status(404).json({ error: "Report not found" });

            if (report.status !== ReportStatus.Assigned &&
                report.status !== ReportStatus.InProgress &&
                report.status !== ReportStatus.Suspended) {
                return res.status(403).json({
                    error: `You are not allowed to assign to an external maintainer if the report is not in assigned/in_progress/suspended state`
                });
            }

            if (report.assigned_to !== user.id) {
                return res.status(403).json({
                    error: `You are not allowed to assign to an external maintainer a report that is not assigned to you`
                });
            }


            const externalMaintainerCategoryId = await operatorDAO.getCategoriesOfExternalMaintainer(externalMaintainerId);
            if (externalMaintainerCategoryId.includes(report.category_id)) {
                await reportDAO.updateReportExternalMaintainer(reportId, externalMaintainerId);
            } else {
                return res.status(403).json({
                    error: `The external maintainer you want to assign to this report does not handle this category`
                });
            }

            return res.status(200).json({
                message: "Report successfully assigned to the external maintainer"
            });

        } catch (error) {
            console.log(error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

// Permits to an external maintainer to update the status of a report assigned to him
router.patch("/ext_maintainer/reports/:reportId",
    validateExternalMaintainerUpdateStatus,
    verifyFirebaseToken([ROLES.EXT_MAINTAINER]),
    async (req: Request, res: Response) => {
        try {
            const reportId = Number(req.params.reportId);
            const user = (req as Request & { user: User }).user;
            let { status } = req.body

            const report = await reportDAO.getReportById(reportId);
            if (!report) return res.status(404).json({ error: "Report not found" });

            if (report.status !== ReportStatus.Assigned &&
                report.status !== ReportStatus.InProgress &&
                report.status !== ReportStatus.Suspended) {
                return res.status(403).json({
                    error: `You are not allowed to change status of a report not in assigned/in_progress/suspended state`
                });
            }

            if (report.external_user !== user.id) {
                return res.status(403).json({
                    error: `You are not allowed to change status of a report that is not assigned to you`
                });
            }

            await reportDAO.updateReportStatus(reportId, status)

            const recipientId = report?.user_id;

            if (recipientId != null) {
                const notification: CreateNotificationDTO = {
                    user_id: recipientId,
                    report_id: Number(req.params.reportId),
                    type: 'status_update',
                    title: `The status of your report "${report.title}" was set to ${status}`
                };
            
                await notificationDAO.createNotification(notification);
            }

            return res.status(200).json({
                message: "Report status updated successfully"
            });

        } catch (error) {
            console.log(error);
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
        body("categoryId").optional({ nullable: true }).isInt().withMessage("categoryId must be an integer if passed"),
        body("officerId").optional({ nullable: true }).isInt().withMessage("officerId must be an integer if passed")
    ],
    verifyFirebaseToken([ROLES.PUB_RELATIONS]),
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
            const categoryIdFinal = categoryId || report.category_id;

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
                const officerCategoryId = await operatorDAO.getCategoriesOfOfficer(officerId);
                if (officerCategoryId.includes(categoryIdFinal)) {
                    assigneeId = officerId
                } else {
                    return res.status(403).json({
                        error: `The officer you want to assign to this report does not handle this category or doesn't exist`
                    });
                }
            }

            // update the report and optionally assigne it if to be status is assigned
            await reportDAO.updateReportStatusAndAssign(reportId, status, user.id, note, categoryId, assigneeId);

            const recipientId = report?.user_id;

            if (recipientId != null) {
                const notification: CreateNotificationDTO = {
                    user_id: recipientId,
                    report_id: Number(req.params.reportId),
                    type: 'status_update',
                    title: `The status of your report "${report.title}" was set to ${status}`
                };
            
                await notificationDAO.createNotification(notification);
            }

            if (status === ReportStatus.Assigned) {
                try {
                    const reportOwner = await userDAO.findUserById(report.user_id);
                    if (reportOwner?.firebase_uid) {
                        getRealtimeGateway().notifyUser(reportOwner.firebase_uid, {
                            type: "report.accepted",
                            title: "Report approved",
                            message: `Your report "${report.title}" has been approved and assigned for action.`,
                            metadata: {
                                reportId,
                                status,
                                categoryId: categoryIdFinal,
                                assignedOfficerId: assigneeId ?? null
                            }
                        });
                    }
                } catch (notifyError) {
                    logger.warn({ notifyError, reportId }, "Failed to emit realtime report notification");
                }
            }

            return res.status(200).json({
                message: "Report status updated successfully"
            });
        } catch (error: any) {
            return res.status(500).json({ error: error.message });
        }
    }
);

//GET /report/:reportId/internal-comments
router.get("/report/:reportId/internal-comments",
    validateReportId,
    verifyFirebaseToken([ROLES.EXT_MAINTAINER, ROLES.TECH_OFFICER]),
    async (req: Request, res: Response) => {
        try {
            const reportId = Number(req.params.reportId);
            const comments = await commentDAO.getCommentsByReportIdAndType(reportId, 'private');

            if (Array.isArray(comments) && comments.length === 0) {
                return res.status(204).send();
            }

            return res.status(200).json({ comments });

        } catch (error: any) {
            console.log(error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);

//GET /report/:reportId/external-comments
router.get("/report/:reportId/external-comments",
    validateReportId,
    verifyFirebaseToken([ROLES.CITIZEN, ROLES.TECH_OFFICER]),
    async (req: Request, res: Response) => {
        try {
            const reportId = Number(req.params.reportId);
            const comments = await commentDAO.getCommentsByReportIdAndType(reportId, 'public');

            if (Array.isArray(comments) && comments.length === 0) {
                return res.status(204).send();
            }

            return res.status(200).json({ comments });

        } catch (error: any) {
            console.log(error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
);


export default router;

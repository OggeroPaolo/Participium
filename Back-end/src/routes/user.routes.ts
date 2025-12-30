import { Router } from "express";
import type { Request, Response } from "express";
import { body, param, validationResult } from "express-validator";
import UserDAO from "../dao/UserDAO.js";
import { ROLES } from "../models/userRoles.js";
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js";
import { upload } from "../config/multer.js";
import cloudinary from "../config/cloudinary.js";
import { unlink } from "node:fs/promises";
import type { User } from "../models/user.js"
import path from 'node:path';
import sharp from 'sharp';

const router = Router();
const userDao = new UserDAO();

// Get user by Firebase UID
router.get("/users/:firebaseUid", verifyFirebaseToken([ROLES.ADMIN, ROLES.CITIZEN, ROLES.PUB_RELATIONS, ROLES.TECH_OFFICER, ROLES.EXT_MAINTAINER]), async (req: Request, res: Response) => {
    const { firebaseUid } = req.params as { firebaseUid: string };

    try {
        const user = await userDao.findUserByUid(firebaseUid);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.status(200).json({ user });
    } catch (error: any) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

router.patch("/users/:userId",
    upload.single("photo_profile"),
    [
        param("userId").isInt().withMessage("User ID must be a valid integer"),
        body("telegram_username").optional({ nullable: true }).isString().withMessage("telegram_username must be a string"),
        body("email_notifications_enabled").optional({ nullable: true }).isBoolean().withMessage("email_notifications_enabled must be a boolean").toBoolean()
    ],
    verifyFirebaseToken([ROLES.CITIZEN]),
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const extractedErrors = errors.array().map(err => err.msg);
            return res.status(400).json({ errors: extractedErrors });
        }

        let uploadedUrl: string | null = null;

        try {
            const { telegram_username, email_notifications_enabled } = req.body || {};
            const userId = Number(req.params.userId);

            //Get user from DB
            const user = await userDao.findUserById(userId);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            // Check if the requester is the same user
            const requestUser = (req as Request & { user: User }).user;
            if (requestUser.id !== user.id) {
                return res.status(403).json({
                    error: `You are not allowed to change the user information for another user`
                });
            }

            const file = req.file;
            let oldImgPublicId: string | null = null;

            if (file) {
                // Save old image public_id if exists
                if (user.profile_photo_url) {
                    const parsedUrl = new URL(user.profile_photo_url);
                    oldImgPublicId = parsedUrl.pathname.split('/').pop() || null;
                }

                const newPath = file.path + path.extname(file.originalname);

                // Resize the image
                await sharp(file.path)
                    .resize(720, 720, {
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .toFile(newPath);

                // Upload to Cloudinary
                const result = await cloudinary.uploader.upload(newPath, {
                    folder: 'Participium',
                    resource_type: 'raw',
                });

                uploadedUrl = result.secure_url;

                // Delete local temporary files
                await unlink(file.path);
                await unlink(newPath);

                // Delete old Cloudinary image after new one is uploaded
                if (oldImgPublicId) {
                    await cloudinary.uploader.destroy(`Participium/${oldImgPublicId}`, { resource_type: 'raw' });
                }
            }

            // Update user info in DB
            await userDao.updateUserInfo(
                user.id,
                telegram_username,
                email_notifications_enabled,
                uploadedUrl || undefined
            );

            return res.status(200).json({
                message: "User information updated"
            });

        } catch (error) {
            console.error(error);

            // Rollback new Cloudinary upload if something went wrong
            if (uploadedUrl) {
                await rollbackCloundinaryImages(uploadedUrl);
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


export default router;

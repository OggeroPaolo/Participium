import { runQuery, getOne, Update } from "../config/database.js";
import type { User } from "../models/user.js"

class UserDAO {
    async findUserByUid(firebaseUid: string): Promise<User | null> {
        const sql = "SELECT u.id, u.firebase_uid, u.email, u.username, u.first_name, u.last_name, r.name AS role_name, r.type AS role_type, u.profile_photo_url, u.telegram_username, u.email_notifications_enabled, u.is_active, u.is_verified, u.created_at, u.updated_at, u.last_login_at FROM users u, roles r WHERE r.id = u.role_id AND u.firebase_uid = ?";
        const user = await getOne<User>(sql, [firebaseUid]);
        return user === undefined ? null : user;
    }

    async findUserByEmailOrUsername(email: string, username: string): Promise<User | null> {
        const sql = `
        SELECT u.id, u.firebase_uid, u.email, u.username, u.first_name, u.last_name, r.name AS role_name, r.type AS role_type, u.profile_photo_url, u.telegram_username, u.email_notifications_enabled, u.is_active, u.created_at, u.updated_at, u.last_login_at FROM users u, roles r WHERE r.id = u.role_id AND (u.email = ? OR u.username = ?)
    `;
        const user = await getOne<User>(sql, [email, username]);
        return user === undefined ? null : user;
    }

    async findCodeExpiryByEmail(email: string): Promise<{ hashedCode: string, code_expires_at: Date, is_verified: number } | null> {
        const sql = `
        SELECT u.hashedCode, u.code_expires_at, u.is_verified FROM users u WHERE u.email = ?
        `;

        const row = await getOne<{ hashedCode: string; code_expires_at: string; is_verified: number }>(sql, [email]);

        if (!row) return null;

        return {
            hashedCode: row.hashedCode,
            code_expires_at: new Date(row.code_expires_at.replace(' ', 'T') + 'Z'),
            is_verified: row.is_verified
        };
    }

    async verifyUserByEmail(email: string): Promise<boolean> {
        const sql = `
        UPDATE users
        SET is_verified = 1, hashedCode = NULL, code_expires_at = NULL
        WHERE email = ?
    `;

        const result = await Update(sql, [email]);

        return result.changes > 0;
    }

    async updateCodeByEmail(email: string, hashedCode: string): Promise<boolean> {
        const new_expiry_date = new Date(Date.now() + 30 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
        const sql = `
        UPDATE users
        SET hashedCode = ?, code_expires_at = ?
        WHERE email = ?
    `;

        const result = await Update(sql, [hashedCode, new_expiry_date, email]);

        return result.changes > 0;
    }

    async createUser(userData: {
        firebaseUid: string;
        firstName: string;
        lastName: string;
        username: string;
        email: string;
        hashedCode?: string | null | undefined;
        role_id?: number | null | undefined;
    }): Promise<User> {

        // if an hashed code is passed the user is a self created user otherwise it was created by an admin and it is verified by default
        const isVerified = userData.hashedCode ? 0 : 1;
        const hashedCodeToSave = userData.hashedCode ?? null;
        const codeExpiresAt = userData.hashedCode ? new Date(Date.now() + 30 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19) : null;

        const sql = `
            INSERT INTO users (
                firebase_uid, first_name, last_name, username, email,
                hashedCode, code_expires_at, is_verified, role_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;

        await runQuery(sql, [
            userData.firebaseUid,
            userData.firstName,
            userData.lastName,
            userData.username,
            userData.email,
            hashedCodeToSave,
            codeExpiresAt,
            isVerified,
            userData.role_id ? userData.role_id : 1,
        ]);
        const createdUser = await this.findUserByUid(userData.firebaseUid);
        if (!createdUser) {
            throw new Error("Failed to retrieve the created user");
        }
        return createdUser;
    }

}

export default UserDAO


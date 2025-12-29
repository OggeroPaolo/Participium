import { runQuery, getOne, Update } from "../config/database.js";
import type { User } from "../models/user.js";
import { mapUserWithRoles } from "../services/userService.js";

class UserDAO {
    private readonly baseSelect = `
        SELECT
            u.*,
            r.name AS role_name,
            r.type AS role_type
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
    `;

    /* ---------------- FIND ---------------- */

    async findUserById(userId: number): Promise<User | undefined> {
        const sql = `${this.baseSelect} WHERE u.id = ?`;
        const row = await getOne<any>(sql, [userId]);
        return row ? mapUserWithRoles(row) : undefined;
    }

    async findUserByUid(firebaseUid: string): Promise<User | undefined> {
        const sql = `${this.baseSelect} WHERE u.firebase_uid = ?`;
        const row = await getOne<any>(sql, [firebaseUid]);
        return row ? mapUserWithRoles(row) : undefined;
    }

    async findUserByEmailOrUsername(
        email: string,
        username: string
    ): Promise<User | undefined> {
        const sql = `
            ${this.baseSelect}
            WHERE u.email = ? OR u.username = ?
        `;
        const row = await getOne<any>(sql, [email, username]);
        return row ? mapUserWithRoles(row) : undefined;
    }

    /* ---------------- CREATE ---------------- */

    async createUser(userData: {
        firebaseUid: string;
        firstName: string;
        lastName: string;
        username: string;
        email: string;
        role_id?: number;
    }): Promise<User> {
        const insertUserSql = `
            INSERT INTO users (
                firebase_uid,
                first_name,
                last_name,
                username,
                email
            ) VALUES (?, ?, ?, ?, ?);
        `;

        await runQuery(insertUserSql, [
            userData.firebaseUid,
            userData.firstName,
            userData.lastName,
            userData.username,
            userData.email
        ]);

        const createdUser = await this.findUserByUid(userData.firebaseUid);
        if (!createdUser) {
            throw new Error("Failed to retrieve created user");
        }

        const roleId = userData.role_id ?? 1;

        await runQuery(
            `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
            [createdUser.id, roleId]
        );

        return createdUser;
    }

    /* ---------------- UPDATE ---------------- */

    async updateUserInfo(
        userId: number,
        telegram_username?: string,
        email_notifications_enabled?: boolean,
        uploadedUrl?: string
    ) {
        const query = `
            UPDATE users
            SET
                telegram_username = COALESCE(?, telegram_username),
                email_notifications_enabled = COALESCE(?, email_notifications_enabled),
                profile_photo_url = COALESCE(?, profile_photo_url),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?;
        `;

        const result = await Update(query, [
            telegram_username,
            email_notifications_enabled,
            uploadedUrl,
            userId
        ]);

        if (result.changes === 0) {
            throw new Error("User not found or no changes made");
        }
    }
}

export default UserDAO;

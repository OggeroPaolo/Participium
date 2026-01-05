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
        telegram_username?: string | null,
        email_notifications_enabled?: boolean | null,
        uploadedUrl?: string | null
    ) {
        // Build dynamic query based on what fields are provided
        const updates: string[] = [];
        const params: any[] = [];

        // Handle telegram_username: undefined = don't update, null = set to null, string = update
        if (telegram_username !== undefined) {
            updates.push("telegram_username = ?");
            params.push(telegram_username);
        }

        // Handle email_notifications_enabled: undefined = don't update, null/boolean = update
        if (email_notifications_enabled !== undefined) {
            updates.push("email_notifications_enabled = ?");
            params.push(email_notifications_enabled ? 1 : 0);
        }

        // Handle profile_photo_url: undefined = don't update, null = set to null, string = update
        if (uploadedUrl !== undefined) {
            updates.push("profile_photo_url = ?");
            params.push(uploadedUrl);
        }

        // Always update the timestamp
        updates.push("updated_at = CURRENT_TIMESTAMP");

        if (updates.length === 1) {
            // Only timestamp update, no actual changes
            return;
        }

        const query = `
            UPDATE users
            SET ${updates.join(", ")}
            WHERE id = ?;
        `;

        params.push(userId);

        const result = await Update(query, params);

        if (result.changes === 0) {
            throw new Error("User not found or no changes made");
        }
    }
}

export default UserDAO;

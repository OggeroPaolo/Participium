import { runQuery, getOne, Update } from "../config/database.js";
import type { User } from "../models/user.js"
import { mapUserWithRoles } from "../services/userService.js";

class UserDAO {
    async findUserByUid(firebaseUid: string): Promise<User | null> {
        const query = `
            SELECT
              u.*,
              r.name AS role_name,
              r.type AS role_type
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            WHERE u.firebase_uid = ?
          `;

        const row = await getOne<any>(query, [firebaseUid]);
        const user = mapUserWithRoles(row);
        return user ?? null;
    }


    async findUserByEmailOrUsername(email: string, username: string): Promise<User | null> {
        const query = `
            SELECT
              u.*,
              r.name AS role_name,
              r.type AS role_type
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            WHERE u.email = ? OR u.username = ?
          `;

        const row = await getOne<any>(query, [email, username]);
        const user = mapUserWithRoles(row);
        return user ?? null;
    }


    async createUser(userData: {
        firebaseUid: string;
        firstName: string;
        lastName: string;
        username: string;
        email: string;
        role_id?: number | null | undefined;
    }): Promise<User> {
        // Insert user
        const insertUserSql = `
            INSERT INTO users (firebase_uid, first_name, last_name, username, email)
            VALUES (?, ?, ?, ?, ?);
        `;
        await runQuery(insertUserSql, [
            userData.firebaseUid,
            userData.firstName,
            userData.lastName,
            userData.username,
            userData.email
        ]);

        // Retrieve the newly created user
        const createdUser = await this.findUserByUid(userData.firebaseUid);
        if (!createdUser) {
            throw new Error("Failed to retrieve the created user");
        }

        // Assign role (default to 1 if not provided)
        const roleId = userData.role_id ?? 1;
        const insertRoleSql = `
            INSERT INTO user_roles (user_id, role_id)
            VALUES (?, ?);
        `;
        await runQuery(insertRoleSql, [createdUser.id, roleId]);

        return createdUser;
    }

    async updateUserInfo(userId: number, telegram_username?: string, email_notifications_enabled?: boolean, uploadedUrl?: string) {
        console.log(email_notifications_enabled)
        const query = `
            UPDATE users
            SET telegram_username = COALESCE(?, telegram_username), 
            email_notifications_enabled = COALESCE(?, email_notifications_enabled),
            profile_photo_url = COALESCE(?, profile_photo_url)
            WHERE id = ?;
        `;

        const result = await Update(query, [telegram_username, email_notifications_enabled, uploadedUrl, userId]);

        if (result.changes === 0) {
            throw new Error("Report not found or no changes made");
        }
    }
}

export default UserDAO


import { runQuery, getOne, Update } from "../config/database.js";
import type { User } from "../models/user.js"

class UserDAO {
    private baseSelect = `
        SELECT 
            u.id, 
            u.firebase_uid, 
            u.email, 
            u.username, 
            u.first_name, 
            u.last_name, 
            r.name AS role_name, 
            r.type AS role_type, 
            u.profile_photo_url, 
            u.telegram_username, 
            u.email_notifications_enabled, 
            u.is_active, 
            u.created_at, 
            u.updated_at, 
            u.last_login_at
        FROM users u
        JOIN roles r ON r.id = u.role_id
    `;

    async findUserByUid(firebaseUid: string): Promise<User | null> {
        const sql = `${this.baseSelect} WHERE u.firebase_uid = ?`;
        const user = await getOne<User>(sql, [firebaseUid]);
        return user === undefined ? null : user;
    }

    async findUserById(userId: number): Promise<User | null> {
        const sql = `${this.baseSelect} WHERE u.id = ?`;
        const user = await getOne<User>(sql, [userId]);
        return user === undefined ? null : user;
    }

    async findUserByEmailOrUsername(email: string, username: string): Promise<User | null> {
        const sql = `${this.baseSelect} WHERE (u.email = ? OR u.username = ?)`;
        const user = await getOne<User>(sql, [email, username]);
        return user === undefined ? null : user;
    }

    async createUser(userData: {
        firebaseUid: string;
        firstName: string;
        lastName: string;
        username: string;
        email: string;
        role_id?: number | null | undefined;
    }): Promise<User> {
        const sql = `
      INSERT INTO users (firebase_uid, first_name, last_name, username, email, role_id)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
        await runQuery(sql, [
            userData.firebaseUid,
            userData.firstName,
            userData.lastName,
            userData.username,
            userData.email,
            userData.role_id? userData.role_id : 1,
        ]);
        const createdUser = await this.findUserByUid(userData.firebaseUid);
        if (!createdUser) {
            throw new Error("Failed to retrieve the created user");
        }
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


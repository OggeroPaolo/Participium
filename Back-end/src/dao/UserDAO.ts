import { runQuery, getOne } from "../config/database.js";
import type { User } from "../models/user.js"

class UserDAO {
    async findUserByUid(firebaseUid: string): Promise<User | null> {
        const sql = "SELECT u.id, u.firebase_uid, u.email, u.username, u.first_name, u.last_name, r.name AS role_name, u.profile_photo_url, u.telegram_username, u.email_notifications_enabled, u.is_active, u.created_at, u.updated_at, u.last_login_at FROM users u, roles r WHERE r.id = u.role_id AND u.firebase_uid = ?";
        const user = await getOne<User>(sql, [firebaseUid]);
        return user === undefined ? null : user;
    }

    async findUserByEmailOrUsername(email: string, username: string): Promise<User | null> {
        const sql = `
        SELECT u.id, u.firebase_uid, u.email, u.username, u.first_name, u.last_name, r.name AS role_name, u.profile_photo_url, u.telegram_username, u.email_notifications_enabled, u.is_active, u.created_at, u.updated_at, u.last_login_at FROM users u, roles r WHERE r.id = u.role_id AND (u.email = ? OR u.username = ?)
    `;
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

}

export default UserDAO


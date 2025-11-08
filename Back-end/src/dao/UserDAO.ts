import { runQuery, getOne } from "../config/database.js";
import type { User } from "../models/user.js"

class UserDAO {
    async findUserByUid(firebaseUid: string): Promise<User | null> {
        const sql = "SELECT * FROM users WHERE firebase_uid = ?";
        const user = await getOne<User>(sql, [firebaseUid]);
        return user === undefined ? null : user;
    }

    async findUserByEmailOrUsername(email: string, username: string): Promise<User | null> {
        const sql = `
      SELECT * FROM users WHERE email = ? OR username = ?
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
    }): Promise<User> {
        const sql = `
      INSERT INTO users (firebase_uid, first_name, last_name, username, email)
      VALUES (?, ?, ?, ?, ?);
    `;
        await runQuery(sql, [
            userData.firebaseUid,
            userData.firstName,
            userData.lastName,
            userData.username,
            userData.email,
        ]);
        const createdUser = await this.findUserByUid(userData.firebaseUid);
        if (!createdUser) {
            throw new Error("Failed to retrieve the created user");
        }
        return createdUser;
    }

}

export default UserDAO


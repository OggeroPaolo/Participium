import { runQuery, getAll } from "../config/database.js"
import type { User } from "../models/user.js"
import UserDAO from "../dao/UserDAO.js";

const userDao = new UserDAO();

export default class OperatorDao {

  async getOperators(): Promise<User[]> {
    const query = "SELECT u.id, u.firebase_uid, u.email, u.username, u.first_name, u.last_name, r.name AS role_name, r.type AS role_type, u.profile_photo_url, u.telegram_username, u.email_notifications_enabled, u.is_active, u.created_at, u.updated_at, u.last_login_at FROM users u, roles r WHERE r.id = u.role_id AND r.name != \'admin\' AND r.name != \'citizen\'";
    const operators = await getAll<User>(query);

    return operators;
  }
}

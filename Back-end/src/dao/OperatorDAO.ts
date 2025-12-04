import { runQuery, getAll, getOne } from "../config/database.js"
import type { User } from "../models/user.js"
import UserDAO from "../dao/UserDAO.js";

const userDao = new UserDAO();

export default class OperatorDao {

  async getOperators(): Promise<User[]> {
    const query = "SELECT u.id, u.firebase_uid, u.email, u.username, u.first_name, u.last_name, r.name AS role_name, r.type AS role_type, u.profile_photo_url, u.telegram_username, u.email_notifications_enabled, u.is_active, u.created_at, u.updated_at, u.last_login_at FROM users u, roles r WHERE r.id = u.role_id AND (r.type = \'pub_relations\' OR r.type = \'tech_officer\')";
    const operators = await getAll<User>(query);

    return operators;
  }

  // Return the Id of the operator with the least assigned reports in a given category
  async getAssigneeId(categoryId: number): Promise<number> {
    const query = `
      SELECT u.id, COUNT(rep.id) AS assigned_report_count
      FROM users u, roles r, offices o
      LEFT JOIN reports rep 
        ON rep.assigned_to = u.id AND rep.status = 'assigned'
      WHERE r.id = u.role_id
        AND o.id = r.office_id
        AND o.category_id = ?
      GROUP BY u.id
      ORDER BY assigned_report_count ASC
      LIMIT 1
    `;

    // Adjust the type to match the query result
    const assignee = await getAll<{ id: number; assigned_report_count: number }>(query, [categoryId]);

    if (!assignee[0]?.id) {
      throw new Error('No assignee found');
    }

    return assignee[0].id;
  }

  async getCategoryOfOfficer(officerId: number): Promise<Number | undefined> {
    const query = "SELECT o.category_id FROM users u, roles r, offices o WHERE r.id = u.role_id AND r.office_id = o.id AND u.id = ?";
    const officerCategoryId = await getOne<{ category_id: number }>(query, [officerId]);

    return officerCategoryId?.category_id;
  }

  async getCategoryOfExternalMaintainer(externalMaintainerId: number): Promise<Number | undefined> {
    const query = "SELECT c.category_id FROM users u, roles r, companies c WHERE r.id = u.role_id AND r.company_id = c.id AND u.id = ?";
    const externalMaintainerCategoryId = await getOne<{ category_id: number }>(query, [externalMaintainerId]);

    return externalMaintainerCategoryId?.category_id;
  }

  async getOperatorsByCategory(categoryId: number): Promise<User[]> {
    const query = "SELECT u.id, u.firebase_uid, u.email, u.username, u.first_name, u.last_name, r.name AS role_name, r.type AS role_type, u.profile_photo_url, u.telegram_username, u.email_notifications_enabled, u.is_active, u.created_at, u.updated_at, u.last_login_at FROM users u, roles r, offices o WHERE r.id = u.role_id AND r.office_id = o.id AND o.category_id = ? AND (r.type = \'pub_relations\' OR r.type = \'tech_officer\')";
    const operators = await getAll<User>(query, [categoryId]);

    return operators;
  }
}

import { runQuery, getAll, getOne } from "../config/database.js"
import { mapUsersWithRoles, type User } from "../models/user.js"
import UserDAO from "../dao/UserDAO.js";
import { mapExternalUsersWithRoles, type ExternalUserDTO } from "../dto/externalUserDTO.js";

const userDao = new UserDAO();

export interface ExternalMaintainerFilters {
  categoryId?: number;
  companyId?: number;
}


export default class OperatorDao {

  // Return all the operators
  async getOperators(): Promise<User[]> {
    const query = `
    SELECT
      u.*,
      r.name AS role_name,
      r.type AS role_type
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    WHERE r.type IN ('pub_relations', 'tech_officer')
  `;
    const rows = await getAll<any>(query);
    return mapUsersWithRoles(rows);
  }


  // Return the Id of the operator with the least assigned reports in a given category
  async getAssigneeId(categoryId: number): Promise<number> {
    const query = `
    SELECT 
      u.id, 
      COUNT(rep.id) AS assigned_report_count
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    JOIN offices o ON o.id = r.office_id
    LEFT JOIN reports rep ON rep.assigned_to = u.id AND rep.status = 'assigned'
    WHERE o.category_id = ?
    GROUP BY u.id
    ORDER BY assigned_report_count ASC
    LIMIT 1
  `;

    const assignee = await getOne<{ id: number; assigned_report_count: number }>(query, [categoryId]);

    if (!assignee?.id) {
      throw new Error('No assignee found');
    }

    return assignee.id;
  }


  // Return all category IDs of an officer by user ID
  async getCategoriesOfOfficer(officerId: number): Promise<number[]> {
    const query = `
    SELECT DISTINCT o.category_id
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    JOIN offices o ON o.id = r.office_id
    WHERE u.id = ?
  `;

    const categories = await getAll<{ category_id: number }>(query, [officerId]);
    return categories.map(c => c.category_id);
  }


  // Return all category IDs handled by an external maintainer
  async getCategoriesOfExternalMaintainer(
    externalMaintainerId: number
  ): Promise<number[]> {
    const query = `
    SELECT DISTINCT c.category_id
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    JOIN companies c ON c.id = r.company_id
    WHERE u.id = ?
  `;

    const rows = await getAll<{ category_id: number }>(query, [externalMaintainerId]);

    return rows.map(r => r.category_id).filter(Boolean);
  }

  // Return all operators the handle a specific category
  async getOperatorsByCategory(categoryId: number): Promise<User[]> {
    const query = `
    SELECT
      u.id,
      u.firebase_uid,
      u.email,
      u.username,
      u.first_name,
      u.last_name,
      u.profile_photo_url,
      u.telegram_username,
      u.email_notifications_enabled,
      u.is_active,
      u.created_at,
      u.updated_at,
      u.last_login_at,
      r.name AS role_name,
      r.type AS role_type
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    JOIN offices o ON o.id = r.office_id
    WHERE o.category_id = ?
      AND r.type IN ('pub_relations', 'tech_officer')
  `;

    const rows = await getAll<any>(query, [categoryId]);
    return mapUsersWithRoles(rows);
  }

  async getExternalMaintainersByFilter(
    filters: ExternalMaintainerFilters = {}
  ): Promise<ExternalUserDTO[]> {

    const conditions = ["r.type = 'external_maintainer'"];
    const params: any[] = [];

    if (Number.isFinite(filters.companyId)) {
      conditions.push("c.id = ?");
      params.push(filters.companyId);
    }

    if (Number.isFinite(filters.categoryId)) {
      conditions.push("c.category_id = ?");
      params.push(filters.categoryId);
    }

    let query = `
    SELECT
      u.*,
      r.name AS role_name,
      r.type AS role_type,
      c.id AS company_id,
      c.name AS company_name
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    LEFT JOIN companies c ON c.id = r.company_id
  `;

    if (conditions.length) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const rows = await getAll(query, params);
    return mapExternalUsersWithRoles(rows);
  }
}

import { getAll } from "../config/database.js"
import type { RoleType } from "../models/userRoles.js";

//Returns all roles for operators, if type isn't specific it ignore admin and citizen roles
export default class RolesDao {
  async getRoles(type?: RoleType): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (type) {
      conditions.push("type = ?");
      params.push(type);
    } else {
      // default behavior
      conditions.push("type != ?");
      params.push("admin");
      conditions.push("type != ?");
      params.push("citizen");
    }

    let query = "SELECT * FROM roles";
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    return getAll(query, params);
  }


  async getRolesByIds(roleIds: number[]): Promise<any[]> {
    if (!roleIds.length) return [];

    const placeholders = roleIds.map(() => "?").join(",");
    const query = `SELECT * FROM roles WHERE id IN (${placeholders})`;

    const roles = await getAll(query, roleIds);
    return roles;
  }
}
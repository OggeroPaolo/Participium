import { getAll } from "../config/database.js"

//Returns all roles for operators (non-admin, non-citizen)
export default class RolesDao {
  async getRoles(): Promise<any[]> {
    const query = "SELECT * FROM roles WHERE type != \'admin\' AND type != \'citizen\'";
    const roles = await getAll(query);
    return roles;
  }
}

import { getAll } from "../config/database.js"


export default class RolesDao {
  async getRoles(): Promise<any[]> {
    const query = "SELECT * FROM roles WHERE name != \'admin\' AND name != \'citizen\'";
    const roles = await getAll(query);
    return roles;
  }
}

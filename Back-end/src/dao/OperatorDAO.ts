import { getAll } from "../config/database.js"


export default class OperatorDao {
  async getOperators(): Promise<string[]> {
    // const query = "SELECT U.id AS id, email, username, first_name, last_name, profile_photo_url, R.name  AS role_name, U.created_at as created_at FROM users U, roles R WHERE U.role_id = R.id AND R.name != \'admin\' AND R.name != \'citizen\'";
    const query = "SELECT U.id AS id, email, username, first_name, last_name, profile_photo_url, U.created_at as created_at FROM users U";
    const rows = await getAll(query); 

    return this.mapRowsToOperators(rows);
  }

  private mapRowsToOperators(rows: any[]): any[] {
    return rows.map(row => ({
      id: row.id,
      email: row.email,
      username: row.username,
      first_name: row.first_name,
      last_name: row.last_name,
      profile_photo_url: row.profile_photo_url,
      // role_name: row.role_name,
      created_at: row.created_at
    }));
  }
}

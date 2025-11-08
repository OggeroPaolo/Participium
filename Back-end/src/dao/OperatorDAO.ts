import { getAll } from "../config/database.js"
import type { User } from "../models/user.js"


export default class OperatorDao {
  async getOperators(): Promise<User[]> {
    // const query = "SELECT U.id AS id, email, username, first_name, last_name, profile_photo_url, R.name  AS role_name, U.created_at as created_at FROM users U, roles R WHERE U.role_id = R.id AND R.name != \'admin\' AND R.name != \'citizen\'";
    const query = "SELECT * FROM users U";
    const operators = await getAll<User>(query); 

    return operators;
  }
}

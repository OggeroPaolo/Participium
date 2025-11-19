import { getAll } from "../config/database.js";

export default class CategoriesDao {
  async getCategories(): Promise<any[]> {
    const query = `
      SELECT 
        id,
        name,
        description,
        default_technical_office_id,
        is_active,
        created_at,
        updated_at
      FROM categories
    `;
    return await getAll(query);
  }
}

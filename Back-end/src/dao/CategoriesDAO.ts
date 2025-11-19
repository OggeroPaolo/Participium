import { getAll } from "../config/database.js";

export default class CategoriesDao {
  async getCategories(): Promise<any[]> {
    const query = `
      SELECT * FROM categories
    `;
    return await getAll(query);
  }
}

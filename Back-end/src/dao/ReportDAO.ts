import {getAll} from '../config/database.js'
import { type ReportMap } from '../models/reportMap.js';

export default class ReportDao {
    async getMapReports(): Promise<ReportMap[]> {
    const sql = `
      SELECT r.id, r.title, u.first_name, u.last_name, r.position_lat, r.position_lng
      FROM reports r
      JOIN users u ON r.user_id = u.id
    `;
    return getAll<ReportMap>(sql);
  }
}

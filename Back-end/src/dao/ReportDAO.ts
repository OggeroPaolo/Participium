import {getAll, Update, getOne} from '../config/database.js'
import { type ReportMap } from '../models/reportMap.js';
import type { Report } from "../models/report.js"

export default class ReportDao {
    async getMapReports(): Promise<ReportMap[]> {
    const sql = `
      SELECT r.id, r.title, u.first_name, u.last_name, r.position_lat, r.position_lng
      FROM reports r
      JOIN users u ON r.user_id = u.id
    `;
    return getAll<ReportMap>(sql);
  }

  async updateReportStatusAndAssign(reportId: number, status: string, reviewerId: number, note?: string, categoryId?: number, assigneeId?: number) {
    const query = `
      UPDATE reports
      SET status = ?, 
        reviewed_by = ?,
        note = COALESCE(?, note),
        category_id = COALESCE(?, category_id),
        assigned_to = COALESCE(?, assigned_to)
      WHERE id = ?;
    `;

    const result = await Update(query, [status, reviewerId, note, categoryId, assigneeId, reportId]);

    if (result.changes === 0) {
      throw new Error("Report not found or no changes made");
    }

    return result;
  }

  async getReportById(reportId: number): Promise<Report | undefined> {
    const sql = `
      SELECT *
      FROM reports
      WHERE id = ?
    `;
    return getOne<Report>(sql, [reportId]);
  }
}

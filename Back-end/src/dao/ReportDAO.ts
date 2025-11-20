import { Update, getOne } from "../config/database.js"
import type { Report } from "../models/report.js"

//TMP error definition
export class ReportNotFoundError extends Error { }
export class CategoryNotFoundError extends Error { }


export default class ReportDao {
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

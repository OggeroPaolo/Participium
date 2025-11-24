import { getAll, Update, getOne } from '../config/database.js'
import { type ReportMap } from '../models/reportMap.js';
import type { Report } from "../models/report.js"
import type { CreateReportDTO } from '../dto/CreateReportDTO.js';

export default class ReportDao {
  async getAcceptedReportsForMap(): Promise<ReportMap[]> {
    const sql = `
      SELECT r.id, r.title, u.first_name, u.last_name, r.position_lat, r.position_lng
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.status != 'pending_approval'
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

  async createReport(data: CreateReportDTO): Promise<Report> {
    const sql = `
      INSERT INTO reports (
        user_id, category_id, title, description,
        position_lat, position_lng, is_anonymous, status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, 'pending_approval', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `;

    const params = [
      data.user_id,
      data.category_id,
      data.title,
      data.description,
      data.position_lat,
      data.position_lng,
      data.is_anonymous ? 1 : 0
    ];

    const result = await Update(sql, params);
    if(!result.lastID) {
      throw new Error("Insert report failed, no ID returned");
    }

    const createdReport = await getOne<Report>(
      `SELECT * FROM reports WHERE id = ?`,
      [result.lastID]
    );
    
    if(!createdReport) {
      throw new Error("Failed to fetch created report");
    }

    return createdReport;
  }
}

import { getAll, Update, getOne, beginTransaction, commitTransaction, rollbackTransaction } from '../config/database.js'
import { type ReportMap } from '../models/reportMap.js';
import type { Report } from "../models/report.js"
import type { CreateReportDTO } from '../dto/CreateReportDTO.js';
import type { PhotoDTO, ReportWithPhotosDTO } from '../dto/ReportWithPhotosDTO.js';

export interface ReportFilters {
  status?: string;
  officerId?: number;
  userId?: number;
}

export default class ReportDao {

  

  async getReportsByFilters(filters: ReportFilters): Promise<Report[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }
    if (typeof filters.officerId === "number") {
      conditions.push("assigned_to = ?");
      params.push(filters.officerId);
    }
    if (typeof filters.userId === "number") {
      conditions.push("user_id = ?");
      params.push(filters.userId);
    }
    
    let query = "SELECT * FROM reports";
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const results = await getAll<Report>(query, params);

    return results;
  }

  async getAcceptedReportsForMap(): Promise<ReportMap[]> {
    const sql = `
      SELECT r.id, r.title, u.first_name, u.last_name, u.username, r.position_lat, r.position_lng
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

  async getReportWithPhotos(reportId: number): Promise<ReportWithPhotosDTO> {
    const sql = `
    SELECT r.*, p.url AS photo_url, p.ordering
    FROM reports r
    LEFT JOIN photos p ON p.report_id = r.id
    WHERE r.id = ?
    ORDER BY p.ordering ASC
  `;

    const rows = await getAll(sql, [reportId]);

    if (rows.length === 0) {
      throw new Error("Report not found");
    }

    // Prendi i dati base del report dalla prima riga
    const baseRow = rows[0];

    // Raggruppa le foto filtrando quelle non nulle e ordinandole
    const photos: PhotoDTO[] = rows
      .filter(row => row.photo_url !== null)
      .map(row => ({
        url: row.photo_url,
        ordering: row.ordering,
      }));

    return {
      id: baseRow.id,
      user_id: baseRow.user_id,
      category_id: baseRow.category_id,
      title: baseRow.title,
      description: baseRow.description,
      status: baseRow.status,
      assigned_to: baseRow.assigned_to,
      reviewed_by: baseRow.reviewed_by,
      reviewed_at: baseRow.reviewed_at,
      note: baseRow.note,
      is_anonymous: Boolean(baseRow.is_anonymous),
      position_lat: baseRow.position_lat,
      position_lng: baseRow.position_lng,
      created_at: baseRow.created_at,
      updated_at: baseRow.updated_at,
      photos,
    };
  }

  async createReport(data: CreateReportDTO): Promise<ReportWithPhotosDTO> {
    try {
      await beginTransaction();

      const insertReportSql = `
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

      const result = await Update(insertReportSql, params);
      if (!result.lastID) {
        throw new Error("Insert report failed");
      }
      const reportId = result.lastID;


      if (data.photos && data.photos.length > 0) {
        const insertPhotoSql = `
      INSERT INTO photos (report_id, url, ordering) VALUES (?, ?, ?)
    `;
        for (let i = 0; i < data.photos.length && i < 3; i++) {
          await Update(insertPhotoSql, [reportId, data.photos[i], i + 1]);
        }
      }
      await commitTransaction();

      const createdReport = await this.getReportWithPhotos(reportId);
      return createdReport;

    } catch (error) {
      await rollbackTransaction();
      throw error;
    }
  }
}

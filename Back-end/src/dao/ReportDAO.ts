import { getAll, Update, getOne, beginTransaction, commitTransaction, rollbackTransaction } from '../config/database.js'
import { type ReportMap } from '../models/reportMap.js';
import type { Report } from "../models/report.js"
import type { CreateReportDTO } from '../dto/CreateReportDTO.js';
import type { ReportPhotoDTO, CompleteReportDTO, ReportUserDTO, ReportCategoryDTO } from '../dto/ReportWithPhotosDTO.js';

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
      WHERE r.status != 'pending_approval' AND r.status != 'rejected'
      ORDER BY r.created_at DESC
    `;
    return getAll<ReportMap>(sql);
  }

  async updateReportExternalMaintainer(reportId: number, externalMaintainerId: number) {
    const query = `
      UPDATE reports
      SET external_user = ?
      WHERE id = ?;
    `;

    const result = await Update(query, [externalMaintainerId, reportId]);

    if (result.changes === 0) {
      throw new Error("Report not found or no changes made");
    }

    return result;
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

  async getCompleteReportById(reportId: number): Promise<CompleteReportDTO> {
    const sql = `
    SELECT 
      r.*,
      -- utente autore
      u.id          AS user_id,
      u.first_name  AS user_first_name,
      u.last_name   AS user_last_name,
      u.username    AS user_username,

      -- categoria
      c.id          AS category_id,
      c.name        AS category_name,

      -- assegnatario (può essere null)
      au.id         AS assigned_user_id,
      au.first_name AS assigned_first_name,
      au.last_name  AS assigned_last_name,
      au.username   AS assigned_username,

      -- revisore (può essere null)
      ru.id         AS reviewed_user_id,
      ru.first_name AS reviewed_first_name,
      ru.last_name  AS reviewed_last_name,
      ru.username   AS reviewed_username,

      -- foto
      p.url         AS photo_url,
      p.ordering    AS photo_ordering
    FROM reports r
    JOIN users u ON u.id = r.user_id
    JOIN categories c ON c.id = r.category_id
    LEFT JOIN users au ON au.id = r.assigned_to
    LEFT JOIN users ru ON ru.id = r.reviewed_by
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
    const photos: ReportPhotoDTO[] = rows
      .filter(row => row.photo_url !== null)
      .map(row => ({
        url: row.photo_url as string,
        ordering: row.photo_ordering as number,
      }));
    const user: ReportUserDTO = {
      id: baseRow.user_id,
      complete_name: `${baseRow.user_first_name} ${baseRow.user_last_name}`,
      username: baseRow.user_username,
    };

    const category: ReportCategoryDTO = {
      id: baseRow.category_id,
      name: baseRow.category_name,
    };

    let assigned_to: ReportUserDTO | undefined;
    if (baseRow.assigned_user_id) {
      assigned_to = {
        id: baseRow.assigned_user_id,
        complete_name: `${baseRow.assigned_first_name} ${baseRow.assigned_last_name}`,
        username: baseRow.assigned_username,
      };
    }

    let reviewed_by: ReportUserDTO | undefined;
    if (baseRow.reviewed_user_id) {
      reviewed_by = {
        id: baseRow.reviewed_user_id,
        complete_name: `${baseRow.reviewed_first_name} ${baseRow.reviewed_last_name}`,
        username: baseRow.reviewed_username,
      };
    }

    const completeReport: CompleteReportDTO = {
      id: baseRow.id,
      user,
      category,
      title: baseRow.title,
      description: baseRow.description,
      status: baseRow.status,
      assigned_to,
      reviewed_by,
      reviewed_at: baseRow.reviewed_at ?? undefined,
      note: baseRow.note ?? undefined,
      is_anonymous: Boolean(baseRow.is_anonymous),
      position_lat: baseRow.position_lat,
      position_lng: baseRow.position_lng,
      created_at: baseRow.created_at,
      updated_at: baseRow.updated_at,
      photos,
    };

    return completeReport;
  }

  async createReport(data: CreateReportDTO): Promise<CompleteReportDTO> {
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

      const createdReport = await this.getCompleteReportById(reportId);
      return createdReport;

    } catch (error) {
      await rollbackTransaction();
      throw error;
    }
  }
}

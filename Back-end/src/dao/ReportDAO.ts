import { Update } from "../config/database.js"

//TMP error definition
export class ReportNotFoundError extends Error {}
export class CategoryNotFoundError extends Error{}


export default class ReportDao {
  async updateReportStatus(reportId: number, status: string, reviewerId: number, note?: string) {
    const baseQuery = `UPDATE reports SET status = ?, reviewed_by=? WHERE id = ?`;
    const rejectResolveQuery = `UPDATE reports SET status = ?, note = ?, reviewed_by=? WHERE id = ?`;
    let result;
    // TO DO: add logic to assign a tech office member
    if (status === "rejected" || status === "resolved") {
      result = await Update(rejectResolveQuery, [status, note, reviewerId, reportId]);
    } else {
      result = await Update(baseQuery, [status, reviewerId, reportId]);
    }

    if (result.changes === 0) {
      throw new Error("Report not found or no changes made");
    }

    return result;
  }

  async updateReportCategory(reportId: number, categoryId: number) {
    try {
      const result = await Update(
        `UPDATE reports SET category_id = ? WHERE id = ?`,
        [categoryId, reportId]
      );

      //See if keep this error or not make a report id check before the update
      if (result.changes === 0) {
        throw new ReportNotFoundError("Report not found or no changes made");
      }

      return result;
    } catch (err: any) {
      if (err.code === "SQLITE_CONSTRAINT") {
        throw new CategoryNotFoundError("Category not found");
      }
      throw err;
    }
  }

}

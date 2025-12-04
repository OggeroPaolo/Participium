import { getAll } from '../config/database.js';
import type { Comment } from "../models/comment.js";

export default class CommentDAO {

    async getPrivateCommentsByReportId(reportId: number): Promise<Comment[]> {
        const sql = `
            SELECT *
            FROM comments
            WHERE report_id = ? AND type = 'private'
        `;

        return getAll<Comment>(sql, [reportId])
    }

}
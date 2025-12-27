import type { CreateCommentDTO, GetPrivateCommentDTO } from '../dto/CommentDTO.js';
import type { Comment } from "../models/comment.js";
import { Update, getAll, getOne } from '../config/database.js';

export default class CommentDAO {

    async getPrivateCommentsByReportId(reportId: number): Promise<GetPrivateCommentDTO[]> {
        const sql = `
        SELECT 
          c.*,
          u.username, u.first_name, u.last_name
        FROM comments c
        JOIN users u ON u.id = c.user_id
        WHERE c.report_id = ?
          AND c.type = 'private';
        `;

        return getAll<GetPrivateCommentDTO>(sql, [reportId])
    }

    async getCommentById(id: number): Promise<Comment | undefined> {
        const sql = `
            SELECT *
            FROM comments
            WHERE id = ?
        `;

        return await getOne<Comment>(sql, [id]);
    }

    async createComment(data: CreateCommentDTO): Promise<Comment> {
        const sql = `
            INSERT INTO comments (
                report_id, user_id, type, text, timestamp
            ) VALUES (
             ?, ?, ?, ?, CURRENT_TIMESTAMP
            )
        `;

        const params = [
            data.report_id,
            data.user_id,
            data.type,
            data.text
        ]

        const result = await Update(sql, params);
        if (!result.lastID) {
            throw new Error("Comment creation failed");
        }

        const newComment = await this.getCommentById(result.lastID);

        if (!newComment) {
            throw new Error("Comment created but issue with retrieving it")
        }

        return newComment;
    };

}
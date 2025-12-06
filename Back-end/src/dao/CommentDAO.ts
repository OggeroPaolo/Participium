import { getAll, getOne } from '../config/database.js';
import type { CreateCommentDTO } from '../dto/CommentDTO.js';
import type { Comment } from "../models/comment.js";
import { Update } from '../config/database.js';

export default class CommentDAO {

    async getPrivateCommentsByReportId(reportId: number): Promise<Comment[]> {
        const sql = `
            SELECT *
            FROM comments
            WHERE report_id = ? AND type = 'private'
        `;

        return getAll<Comment>(sql, [reportId])
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

        if(!newComment) {
            throw new Error("Comment created but issue with retrieving it")
        }

        return newComment;
    };

}
export type CreateCommentDTO = {
    report_id: number;
    user_id: number;
    type: string;
    text: string;
}
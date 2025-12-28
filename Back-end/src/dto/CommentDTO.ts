export type CreateCommentDTO = {
    report_id: number;
    user_id: number;
    type: string;
    text: string;
}

export type GetCommentDTO = {
    id: number;
    report_id: number;
    user_id: number;
    type: string;
    text: string;
    timestamp: string;
    username: string;
    last_name: string;
    first_name: string;
    role_name: string;
}
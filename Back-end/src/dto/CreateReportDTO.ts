export type CreateReportDTO = {
    user_id: number;
    category_id: number;
    title: string;
    description: string;
    is_anonymous: boolean;
    position_lat: number;
    position_lng: number;
};
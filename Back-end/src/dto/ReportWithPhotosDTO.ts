export type PhotoDTO = {
  url: string;
  ordering: number;
};

export type ReportWithPhotosDTO = {
  id: number;
  user_id: number;
  category_id: number;
  title: string;
  description: string;
  status: string;
  assigned_to?: number;
  reviewed_by?: number;
  reviewed_at?: string;
  note?: string;
  is_anonymous: boolean;
  position_lat: number;
  position_lng: number;
  created_at: string;
  updated_at: string;
  photos: PhotoDTO[];
};
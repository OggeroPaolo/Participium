export type ReportPhotoDTO = {
  url: string;
  ordering: number;
};

export type ReportUserDTO = {
  id: number,
  complete_name: string,
  username: string
}

export type ReportCategoryDTO = {
  id: number,
  name: string
}

export type CompleteReportDTO = {
  id: number;
  user: ReportUserDTO;
  category: ReportCategoryDTO;
  title: string;
  description: string;
  status: string;
  assigned_to?: ReportUserDTO | undefined;
  reviewed_by?: ReportUserDTO | undefined;
  reviewed_at?: string | undefined;
  note?: string | undefined;
  is_anonymous: boolean;
  position_lat: number;
  position_lng: number;
  created_at: string;
  updated_at: string;
  photos: ReportPhotoDTO[];
};
import type { ReportStatus } from "./reportStatus.js";

export type Report = {
  id: number;
  user_id: number;
  category_id: number;
  title: string;
  description: string;
  status: ReportStatus;
  assigned_to?: number | null;
  external_user?: number | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  note?: string | null;
  address: string;
  position_lat: number;
  position_lng: number;
  created_at: string;
  updated_at: string;
};

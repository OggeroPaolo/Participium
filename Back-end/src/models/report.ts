export type Report = {
  id: number;
  user_id: number;
  category_id: number;
  title: string;
  description: string;
  status: 'pending_approval' | 'assigned' | 'in_progress' | 'suspended' | 'rejected' | 'resolved';
  assigned_to?: number | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  note?: string | null;
  position_lat: number;
  position_lng: number;
  created_at: string;
  updated_at: string;
};

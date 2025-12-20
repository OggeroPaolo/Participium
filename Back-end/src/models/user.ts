export interface UserRoleDTO {
  role_name: string;
  role_type: string;
}

export interface User {
  id: number;
  firebase_uid: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string | null;
  telegram_username?: string | null;
  email_notifications_enabled?: number;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
  roles: UserRoleDTO[];
}

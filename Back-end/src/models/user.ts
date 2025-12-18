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


export function mapUsersWithRoles(rows: any[]): User[] {
  const usersMap = new Map<number, User>();

  rows.forEach(row => {
    if (!usersMap.has(row.id)) {
      usersMap.set(row.id, {
        id: row.id,
        firebase_uid: row.firebase_uid,
        email: row.email,
        username: row.username,
        first_name: row.first_name,
        last_name: row.last_name,
        profile_photo_url: row.profile_photo_url,
        telegram_username: row.telegram_username,
        email_notifications_enabled: row.email_notifications_enabled,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        last_login_at: row.last_login_at,
        roles: []
      });
    }

    usersMap.get(row.id)!.roles.push({
      role_name: row.role_name,
      role_type: row.role_type
    });
  });

  return Array.from(usersMap.values());
}

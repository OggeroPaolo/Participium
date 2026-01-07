import type {UserRoleDTO } from "../models/user.js";

export interface ExternalUserDTO {
  id: number;
  fullName: string;
  username: string;
  email: string;
  companyId: number;
  companyName: string;
  roles: UserRoleDTO[];
}
export function mapExternalUsersWithRoles(rows: any[]): ExternalUserDTO[] {
  const map = new Map<number, ExternalUserDTO>();

  rows.forEach(r => {
    if (!map.has(r.id)) {
      map.set(r.id, {
        id: r.id,
        fullName: `${r.first_name} ${r.last_name}`,
        username: r.username,
        email: r.email,
        companyId: r.company_id,
        companyName: r.company_name,
        roles: []
      });
    }

    map.get(r.id)!.roles.push({
      role_name: r.role_name,
      role_type: r.role_type
    });
  });

  return [...map.values()];
}



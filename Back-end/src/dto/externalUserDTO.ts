import type { User } from "../models/user.js";

export type ExternalUserDTO = {
  id: number;
  fullName: string;
  username: string;
  email: string;
  roleName: string;
  roleType: string;
  companyId: number;
  companyName: string;
};

export function mapToExternalUserDTO(u: User & { company_id: number; company_name: string; category_id?: number }): ExternalUserDTO {
  return {
    id: u.id,
    fullName: `${u.first_name} ${u.last_name}`,
    username: u.username,
    email: u.email,
    roleName: u.role_name,
    roleType: u.role_type,
    companyId: u.company_id,
    companyName: u.company_name,
  };
}

export default mapToExternalUserDTO;

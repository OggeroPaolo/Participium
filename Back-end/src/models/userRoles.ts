
// USER ROLES USED FOR AUTHENTICATION

export const ROLES = {
  ADMIN: "admin",
  PUB_RELATIONS: "pub_relations",
  TECH_OFFICER: "tech_officer",
  EXT_MAINTAINER: "external_maintainer",
  CITIZEN: "citizen"
} as const;

//Type for dto
export type RoleType = typeof ROLES[keyof typeof ROLES];

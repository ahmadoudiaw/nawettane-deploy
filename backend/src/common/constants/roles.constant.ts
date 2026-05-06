import { Role } from '@prisma/client';

export const ADMIN_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.ONCAV_ADMIN,
  Role.ORCAV_ADMIN,
  Role.ODCAV_ADMIN,
  Role.ZONE_ADMIN,
  Role.GUICHET_AGENT,
];

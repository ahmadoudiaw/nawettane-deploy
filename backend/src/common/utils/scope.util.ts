import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { ScopeContext } from '../interfaces/scope-context.interface';

export function buildScopeContext(user: AuthenticatedUser): ScopeContext {
  const organizationIds = user.accessibleOrganizationIds;
  const zoneIds = user.assignments
    .filter((assignment) => assignment.organizationType === 'ZONE')
    .map((assignment) => assignment.organizationId);

  const isGlobal =
    user.role === Role.SUPER_ADMIN || user.role === Role.ONCAV_ADMIN;

  return {
    isGlobal,
    organizationIds,
    zoneIds,
    zoneAssignmentIds: user.zoneAssignmentIds,
    matchIds: user.matchAssignmentIds,
  };
}

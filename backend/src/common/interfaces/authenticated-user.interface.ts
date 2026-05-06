import { Role } from '@prisma/client';
import { ScopeContext } from './scope-context.interface';

export interface AuthenticatedUserAssignment {
  organizationId: string;
  organizationType: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  phone: string;
  role: Role;
  assignments: AuthenticatedUserAssignment[];
  accessibleOrganizationIds: string[];
  zoneAssignmentIds: string[];
  matchAssignmentIds: string[];
  scope?: ScopeContext;
}

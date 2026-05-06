'use client';

import { useMemo } from 'react';
import { getSession } from '@/lib/auth';
import { buildPermissionsMap, PermissionsMap } from '@/lib/permissions';
import type { Role } from '@/lib/types';

const FALLBACK_ROLE: Role = 'SUPPORTER';

/**
 * Returns a stable permissions map for the currently logged-in user.
 * Re-memos only if the role changes (i.e. after a new login).
 */
export function usePermissions(): PermissionsMap {
  const role = getSession()?.user?.role ?? FALLBACK_ROLE;
  return useMemo(() => buildPermissionsMap(role), [role]);
}

import type { Role } from './types';

// ── Permission catalogue ───────────────────────────────────────────────────────

export type Permission =
  | 'create_match'
  | 'edit_match'
  | 'delete_match'
  | 'publish_match'
  | 'cancel_ticket'
  | 'view_users'
  | 'create_user'
  | 'view_analytics'
  | 'manage_zones'
  | 'manage_seasons'
  | 'manage_territories'
  | 'view_reports'
  | 'view_audit_logs'
  | 'manage_imports'
  | 'manage_settings';

// ── Role → permission matrix ───────────────────────────────────────────────────

const ALL_OPS: Permission[] = [
  'create_match', 'edit_match', 'delete_match', 'publish_match',
  'cancel_ticket',
  'view_users', 'create_user',
  'view_analytics', 'manage_zones', 'manage_seasons', 'manage_territories',
  'view_reports', 'view_audit_logs', 'manage_imports', 'manage_settings',
];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // Full access
  SUPER_ADMIN: ALL_OPS,

  // National level — everything except platform settings
  ONCAV_ADMIN: [
    'create_match', 'edit_match', 'delete_match', 'publish_match',
    'cancel_ticket',
    'view_users', 'create_user',
    'view_analytics', 'manage_zones', 'manage_seasons', 'manage_territories',
    'view_reports', 'view_audit_logs', 'manage_imports',
  ],

  // Regional level — same scope as ONCAV but no territory structure management
  ORCAV_ADMIN: [
    'create_match', 'edit_match', 'delete_match', 'publish_match',
    'cancel_ticket',
    'view_users', 'create_user',
    'view_analytics', 'manage_zones', 'manage_seasons', 'manage_territories',
    'view_reports', 'view_audit_logs', 'manage_imports',
  ],

  // Departmental level — no delete match, no territory structure
  ODCAV_ADMIN: [
    'create_match', 'edit_match', 'publish_match',
    'cancel_ticket',
    'view_users', 'create_user',
    'view_analytics', 'manage_zones', 'manage_seasons',
    'view_reports', 'view_audit_logs', 'manage_imports',
  ],

  // Zone level — local match management + ticket cancellation
  ZONE_ADMIN: [
    'create_match', 'edit_match', 'publish_match',
    'cancel_ticket',
    'manage_zones',
  ],

  // Ticket window — cancellations only
  GUICHET_AGENT: ['cancel_ticket'],

  // Municipal agent — same limited scope as guichet
  AGENT_MAIRIE: ['cancel_ticket'],

  // End-users have no admin permissions
  SUPPORTER: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export interface PermissionsMap {
  // Structured flags (spec-required)
  canViewUsers: boolean;
  canCreateMatch: boolean;
  canEditMatch: boolean;
  canDeleteMatch: boolean;
  canCancelTicket: boolean;
  canViewAnalytics: boolean;
  canManageZones: boolean;
  // Extra flags used in UI
  canCreateUser: boolean;
  canPublishMatch: boolean;
  canManageSeasons: boolean;
  canManageTerritories: boolean;
  canViewReports: boolean;
  canViewAuditLogs: boolean;
  canManageImports: boolean;
  canManageSettings: boolean;
  /** Generic helper — can(action) for any permission string */
  can: (action: Permission) => boolean;
}

export function buildPermissionsMap(role: Role): PermissionsMap {
  const set = new Set<Permission>(ROLE_PERMISSIONS[role] ?? []);
  const can = (action: Permission) => set.has(action);
  return {
    canViewUsers:        can('view_users'),
    canCreateUser:       can('create_user'),
    canCreateMatch:      can('create_match'),
    canEditMatch:        can('edit_match'),
    canDeleteMatch:      can('delete_match'),
    canPublishMatch:     can('publish_match'),
    canCancelTicket:     can('cancel_ticket'),
    canViewAnalytics:    can('view_analytics'),
    canManageZones:      can('manage_zones'),
    canManageSeasons:    can('manage_seasons'),
    canManageTerritories:can('manage_territories'),
    canViewReports:      can('view_reports'),
    canViewAuditLogs:    can('view_audit_logs'),
    canManageImports:    can('manage_imports'),
    canManageSettings:   can('manage_settings'),
    can,
  };
}

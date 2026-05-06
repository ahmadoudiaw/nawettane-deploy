const MATCH_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publié',
  CLOSED: 'Clôturé',
  CANCELLED: 'Annulé',
};

const ENTITY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
  SUSPENDED: 'Suspendu',
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrateur',
  GUICHET_AGENT: 'Agent de guichet',
};

export function formatMatchStatus(status: string): string {
  return MATCH_STATUS_LABELS[status] ?? status;
}

export function formatEntityStatus(status: string): string {
  return ENTITY_STATUS_LABELS[status] ?? status;
}

export function formatRole(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function formatCurrency(value: string | number): string {
  const numericValue = typeof value === 'number' ? value : Number(value);

  return new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(Number.isNaN(numericValue) ? 0 : numericValue);
}

const TICKET_STATUS_LABELS: Record<string, string> = {
  GENERATED: 'Non utilisé',
  USED: 'Déjà utilisé',
  CANCELLED: 'Annulé',
};

export function formatTicketStatus(status: string): string {
  return TICKET_STATUS_LABELS[status] ?? status;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-SN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

type ActionStyle = { label: string; color: string; bg: string };

const AUDIT_ACTION_STYLES: Record<string, ActionStyle> = {
  MATCH_CREATED:        { label: 'Match créé',           color: '#166534', bg: '#dcfce7' },
  MATCH_UPDATED:        { label: 'Match modifié',         color: '#1e40af', bg: '#dbeafe' },
  MATCH_PUBLISHED:      { label: 'Match publié',          color: '#0369a1', bg: '#e0f2fe' },
  MATCH_DEACTIVATED:    { label: 'Match désactivé',       color: '#92400e', bg: '#fef3c7' },
  MATCH_DELETED:        { label: 'Match supprimé',        color: '#991b1b', bg: '#fee2e2' },
  USER_CREATED:         { label: 'Utilisateur créé',      color: '#166534', bg: '#dcfce7' },
  USER_UPDATED:         { label: 'Utilisateur modifié',   color: '#1e40af', bg: '#dbeafe' },
  USER_DEACTIVATED:     { label: 'Utilisateur désactivé', color: '#92400e', bg: '#fef3c7' },
  TICKET_CANCELLED:     { label: 'Billet annulé',         color: '#991b1b', bg: '#fee2e2' },
  REGIONS_IMPORTED:     { label: 'Régions importées',     color: '#5b21b6', bg: '#ede9fe' },
  DEPARTMENTS_IMPORTED: { label: 'Dép. importés',         color: '#5b21b6', bg: '#ede9fe' },
  COMMUNES_IMPORTED:    { label: 'Communes importées',    color: '#5b21b6', bg: '#ede9fe' },
  ODCAV_IMPORTED:       { label: 'ODCAV importés',        color: '#5b21b6', bg: '#ede9fe' },
  ZONES_IMPORTED:       { label: 'Zones importées',       color: '#5b21b6', bg: '#ede9fe' },
  VENUES_IMPORTED:      { label: 'Stades importés',       color: '#5b21b6', bg: '#ede9fe' },
  TEAMS_IMPORTED:       { label: 'Équipes importées',     color: '#5b21b6', bg: '#ede9fe' },
};

export function formatAuditAction(action: string): ActionStyle {
  return AUDIT_ACTION_STYLES[action] ?? { label: action, color: '#374151', bg: '#f3f4f6' };
}

export function formatAuditMetadata(
  action: string,
  metadata: Record<string, unknown> | null,
): string {
  if (!metadata) return '—';
  const m = metadata;

  if (action.startsWith('MATCH_') && m.homeTeam && m.awayTeam) {
    const base = `${m.homeTeam} vs ${m.awayTeam}`;
    if (action === 'MATCH_UPDATED' && Array.isArray(m.updatedFields)) {
      return `${base} — ${(m.updatedFields as string[]).join(', ')}`;
    }
    return base;
  }

  if (action === 'USER_CREATED' || action === 'USER_DEACTIVATED') {
    return `${m.fullName ?? ''}${m.role ? ` (${m.role})` : ''}`;
  }

  if (action === 'USER_UPDATED') {
    const fields = Array.isArray(m.updatedFields)
      ? (m.updatedFields as string[]).join(', ')
      : '';
    return `${m.fullName ?? ''}${fields ? ` — ${fields}` : ''}`;
  }

  if (action === 'TICKET_CANCELLED') {
    return `${m.ticketCode ?? ''}${m.cancelReason ? ` — ${m.cancelReason}` : ''}`;
  }

  if (action.endsWith('_IMPORTED')) {
    return `${m.created ?? 0} créé(s), ${m.skipped ?? 0} ignoré(s)${Number(m.errors) > 0 ? `, ${m.errors} erreur(s)` : ''}`;
  }

  return Object.entries(m)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(' · ')
    .slice(0, 120);
}

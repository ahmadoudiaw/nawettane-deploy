'use client';

import Image from 'next/image';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { buildPermissionsMap, Permission } from '@/lib/permissions';
import { GlobalSearch } from './global-search';

type NavItem = {
  label: string;
  href: string;
  /** null = visible to all authenticated users */
  permission: Permission | null;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord',  href: '/admin/dashboard',               permission: null },
  { label: 'Matchs',           href: '/admin/matches',                  permission: null },
  { label: 'Nouveau match',    href: '/admin/matches/new',              permission: 'create_match' },
  { label: 'Saisons',          href: '/admin/seasons',                  permission: 'manage_seasons' },
  { label: 'Zones',            href: '/admin/zones',                    permission: 'manage_zones' },
  { label: 'Équipes',          href: '/admin/teams',                    permission: 'manage_zones' },
  { label: 'Stades',           href: '/admin/venues',                   permission: 'manage_zones' },
  { label: 'Utilisateurs',     href: '/admin/users',                    permission: 'view_users' },
  { label: 'Tickets',          href: '/admin/tickets',                  permission: 'cancel_ticket' },
  { label: 'Rapports',         href: '/admin/reports',                  permission: 'view_reports' },
  { label: 'Logs',             href: '/admin/audit-logs',               permission: 'view_audit_logs' },
  { label: 'Imports',          href: '/admin/imports',                  permission: 'manage_imports' },
  { label: 'ODCAV',            href: '/admin/odcav',                    permission: 'manage_territories' },
  { label: 'Régions',          href: '/admin/territories/regions',      permission: 'manage_territories' },
  { label: 'Départements',     href: '/admin/territories/departments',  permission: 'manage_territories' },
  { label: 'Communes',         href: '/admin/territories/communes',     permission: 'manage_territories' },
  { label: 'Paiements',        href: '/admin/settings/payments',        permission: 'manage_settings' },
  { label: 'Super Admins',     href: '/admin/settings/super-admins',    permission: 'manage_settings' },
  { label: 'Paramètres app',   href: '/admin/settings/app',             permission: 'manage_settings' },
];

export function AdminNav() {
  const session = getSession();
  const role = session?.user?.role ?? 'SUPPORTER';
  const perms = buildPermissionsMap(role);

  const visible = NAV_ITEMS.filter(
    (item) => item.permission === null || perms.can(item.permission),
  );

  return (
    <div className="panel toolbar">
      <div className="admin-nav__brand">
        <Image src="/logo.png" alt="Logo Nawettane" width={40} height={40} />
        <div>
          <strong>NAWETTANE Admin</strong>
          <div className="muted">Pilotage et supervision</div>
        </div>
      </div>
      <GlobalSearch />
      <div className="button-row">
        {visible.map((item) => (
          <Link key={item.href} className="button button--secondary" href={item.href}>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

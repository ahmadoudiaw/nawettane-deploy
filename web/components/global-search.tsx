'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { searchAdmin } from '@/lib/api';
import type { SearchResults } from '@/lib/types';

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg className="g-search__spinner-svg" width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.22" />
      <path d="M7.5 2A5.5 5.5 0 0 1 13 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconMatch() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1" y="2.5" width="12" height="10.5" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1 5.5h12M4.5 1v3M9.5 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconTeam() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 1.5L2 3.5v3C2 9.8 4.3 12.4 7 13c2.7-.6 5-3.2 5-6.5v-3L7 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function IconZone() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 1C4.8 1 3 2.8 3 5c0 3.5 4 8 4 8s4-4.5 4-8c0-2.2-1.8-4-4-4z" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="7" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function IconTicket() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M1.5 9.5A1.5 1.5 0 0 0 1.5 4.5M1.5 4.5L4 2h9v10H4L1.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7 5v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="1.5 1.5" />
    </svg>
  );
}

function IconPerson() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 13c0-2.8 2.5-5 5.5-5s5.5 2.2 5.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type FlatItem = { key: string; href: string; primary: string; secondary: string; icon: React.ReactNode };
type Section = { label: string; items: FlatItem[] };

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function buildSections(results: SearchResults): Section[] {
  const sections: Section[] = [];

  if (results.matches.length > 0) {
    sections.push({
      label: 'Matchs',
      items: results.matches.map(m => ({
        key: `m-${m.id}`,
        href: `/admin/matches/${m.id}`,
        primary: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
        secondary: `${m.organization.name} · ${fmtDate(m.matchDate)} · ${m.status}`,
        icon: <IconMatch />,
      })),
    });
  }

  if (results.teams.length > 0) {
    sections.push({
      label: 'Équipes',
      items: results.teams.map(t => ({
        key: `t-${t.id}`,
        href: `/admin/teams/${t.id}`,
        primary: t.name,
        secondary: [t.category, t.status].filter(Boolean).join(' · '),
        icon: <IconTeam />,
      })),
    });
  }

  if (results.zones.length > 0) {
    sections.push({
      label: 'Zones',
      items: results.zones.map(z => ({
        key: `z-${z.id}`,
        href: `/admin/zones/${z.id}`,
        primary: z.name,
        secondary: `${z.type} · ${z.status}`,
        icon: <IconZone />,
      })),
    });
  }

  if (results.tickets.length > 0) {
    sections.push({
      label: 'Tickets',
      items: results.tickets.map(tk => ({
        key: `tk-${tk.id}`,
        href: `/admin/tickets?q=${encodeURIComponent(tk.ticketCode)}`,
        primary: tk.ticketCode,
        secondary: `${tk.match.homeTeam.name} vs ${tk.match.awayTeam.name} · ${tk.status}`,
        icon: <IconTicket />,
      })),
    });
  }

  if (results.users.length > 0) {
    sections.push({
      label: 'Utilisateurs',
      items: results.users.map(u => ({
        key: `u-${u.id}`,
        href: `/admin/users/${u.id}`,
        primary: u.fullName,
        secondary: `${u.phone} · ${u.role}`,
        icon: <IconPerson />,
      })),
    });
  }

  return sections;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const sections = useMemo(() => (results ? buildSections(results) : []), [results]);
  const flatItems = useMemo(() => sections.flatMap(s => s.items), [sections]);
  const totalCount = flatItems.length;
  const isEmpty = results !== null && totalCount === 0;

  // ── Debounced search
  useEffect(() => {
    clearTimeout(timerRef.current);
    const term = query.trim();
    if (term.length < 2) {
      setResults(null);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const session = getSession();
      if (!session) { setLoading(false); return; }
      try {
        const data = await searchAdmin(session.token, term);
        setResults(data);
        setOpen(true);
        setActiveIndex(-1);
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  // ── Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !dropdownRef.current) return;
    const el = dropdownRef.current.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const navigate = useCallback((href: string) => {
    router.push(href);
    setOpen(false);
    setQuery('');
    setResults(null);
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); return; }
    if (!open || totalCount === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, totalCount - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      navigate(flatItems[activeIndex].href);
    }
  };

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="g-search">
      <div className="g-search__trigger">
        <span className="g-search__search-icon">
          {loading ? <IconSpinner /> : <IconSearch />}
        </span>
        <input
          ref={inputRef}
          className="g-search__input"
          type="search"
          placeholder="Rechercher…"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (results && query.trim().length >= 2) setOpen(true); }}
          onKeyDown={handleKeyDown}
          aria-label="Recherche globale"
        />
        <span className="g-search__kbd" aria-hidden>
          <kbd>⌘K</kbd>
        </span>
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="g-search__dropdown"
          onMouseLeave={() => setActiveIndex(-1)}
        >
          {isEmpty ? (
            <div className="g-search__empty">
              Aucun résultat pour «&nbsp;{query.trim()}&nbsp;»
            </div>
          ) : (
            <>
              {sections.map((section, si) => {
                const offset = sections.slice(0, si).reduce((acc, s) => acc + s.items.length, 0);
                return (
                  <div key={section.label} className="g-search__section">
                    {si > 0 && <div className="g-search__sep" />}
                    <div className="g-search__section-hd">{section.label}</div>
                    {section.items.map((item, ii) => {
                      const idx = offset + ii;
                      return (
                        <button
                          key={item.key}
                          data-idx={idx}
                          type="button"
                          className={`g-search__item${activeIndex === idx ? ' g-search__item--active' : ''}`}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => navigate(item.href)}
                          tabIndex={-1}
                        >
                          <span className="g-search__item-icon">{item.icon}</span>
                          <span className="g-search__item-body">
                            <span className="g-search__item-primary">{item.primary}</span>
                            <span className="g-search__item-secondary">{item.secondary}</span>
                          </span>
                          <span className="g-search__item-arr" aria-hidden>›</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              <div className="g-search__footer">
                {totalCount}&nbsp;résultat{totalCount > 1 ? 's' : ''}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

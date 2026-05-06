'use client';

import { useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin-guard';
import { AdminNav } from '@/components/admin-nav';
import { PageShell } from '@/components/page-shell';
import { getDashboard, getFilteredDashboard, getAnalytics, ApiError, formatApiError } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { AnalyticsData, DashboardMetrics } from '@/lib/types';
import { formatCurrency, formatRole } from '@/lib/format';
import { RevenueChart, RevenueRow } from '@/components/revenue-chart';

// ── Helpers ───────────────────────────────────────────────────────────────────

type Row = NonNullable<DashboardMetrics['rows']>[number];

function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span className={`dash-trend ${up ? 'dash-trend--up' : 'dash-trend--down'}`}>
      {up ? '↑' : '↓'}&nbsp;{Math.abs(pct)}&nbsp;%
    </span>
  );
}

function KpiCard({
  label,
  value,
  pct,
  sub,
  delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  pct: number | null;
  sub?: string;
  delay?: number;
}) {
  return (
    <div className="card dash-kpi" style={{ animationDelay: `${delay}ms` }}>
      <div className="dash-kpi__top">
        <span className="stat__label">{label}</span>
        <TrendBadge pct={pct} />
      </div>
      <span className="stat__value">{value}</span>
      {sub ? <span className="dash-kpi__sub">{sub}</span> : null}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="card" style={{ display: 'grid', gap: 10 }}>
      <div className="dash-skel" style={{ height: 13, width: '55%' }} />
      <div className="dash-skel" style={{ height: 38, width: '75%' }} />
      <div className="dash-skel" style={{ height: 11, width: '42%' }} />
    </div>
  );
}

function InsightCard({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="card dash-insight">
      <div className="dash-insight__eyebrow">{eyebrow}</div>
      {children}
    </div>
  );
}

function FillGauge({ scanned, sold }: { scanned: number; sold: number }) {
  const pct = sold > 0 ? Math.min(100, Math.round((scanned / sold) * 100)) : 0;
  return (
    <div className="dash-gauge">
      <div className="dash-gauge__labels">
        <span>{scanned.toLocaleString('fr-FR')} scannés</span>
        <strong style={{ color: '#0f766e' }}>{pct}&nbsp;%</strong>
      </div>
      <div className="dash-gauge__track">
        <div className="dash-gauge__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="dash-insight__sub" style={{ marginTop: 6 }}>
        sur {sold.toLocaleString('fr-FR')} tickets vendus
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [global, setGlobal] = useState<DashboardMetrics | null>(null);
  const [zones, setZones] = useState<DashboardMetrics | null>(null);
  const [topMatchData, setTopMatchData] = useState<DashboardMetrics | null>(null);
  const [curr30, setCurr30] = useState<DashboardMetrics | null>(null);
  const [prev30, setPrev30] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) { setLoading(false); return; }
    const { token } = session;
    const today = new Date().toISOString().split('T')[0];

    Promise.all([
      getDashboard(token),
      getFilteredDashboard(token, { reportType: 'zone' }),
      getFilteredDashboard(token, { reportType: 'match' }),
      getFilteredDashboard(token, { fromDate: daysAgoStr(30), toDate: today }),
      getFilteredDashboard(token, { fromDate: daysAgoStr(60), toDate: daysAgoStr(31) }),
    ])
      .then(([g, z, m, c, p]) => {
        setGlobal(g);
        setZones(z);
        setTopMatchData(m);
        setCurr30(c);
        setPrev30(p);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.globallyHandled) return;
        setError(formatApiError(err));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const session = getSession();
    if (!session) { setAnalyticsLoading(false); return; }
    getAnalytics(session.token)
      .then(setAnalytics)
      .catch((err) => { if (!(err instanceof ApiError && err.globallyHandled)) console.error(err); })
      .finally(() => setAnalyticsLoading(false));
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────

  const chartData: RevenueRow[] = (zones?.rows ?? [])
    .map(r => ({ label: r.label, revenue: Number(r.revenue), tickets: r.ticketsSold }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const topZone: Row | null = (zones?.rows ?? [])
    .slice()
    .sort((a, b) => Number(b.revenue) - Number(a.revenue))[0] ?? null;

  const topMatch: Row | null = (topMatchData?.rows ?? [])
    .slice()
    .sort((a, b) => Number(b.revenue) - Number(a.revenue))[0] ?? null;

  const currRev = Number(curr30?.revenue ?? 0);
  const prevRev = Number(prev30?.revenue ?? 0);
  const currTickets = curr30?.ticketsSold ?? 0;
  const prevTickets = prev30?.ticketsSold ?? 0;
  const currScanned = curr30?.ticketsScanned ?? 0;
  const prevScanned = prev30?.ticketsScanned ?? 0;

  return (
    <PageShell
      eyebrow="Pilotage"
      title="Tableau de bord"
      description="Vue synthétique des indicateurs de performance Nawettane."
    >
      <AdminGuard>
        <AdminNav />
        {error ? <div className="error">{error}</div> : null}

        {/* ── KPI row ─────────────────────────────────────────────────────── */}
        <div className="grid grid--cards">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                label="Matchs organisés"
                value={(global?.matchesCount ?? 0).toLocaleString('fr-FR')}
                pct={null}
                delay={0}
              />
              <KpiCard
                label="Tickets vendus"
                value={(global?.ticketsSold ?? 0).toLocaleString('fr-FR')}
                pct={pctDelta(currTickets, prevTickets)}
                sub="vs 30 j précédents"
                delay={60}
              />
              <KpiCard
                label="Revenus totaux"
                value={formatCurrency(global?.revenue ?? 0)}
                pct={pctDelta(currRev, prevRev)}
                sub="vs 30 j précédents"
                delay={120}
              />
              <KpiCard
                label="Billets scannés"
                value={(global?.ticketsScanned ?? 0).toLocaleString('fr-FR')}
                pct={pctDelta(currScanned, prevScanned)}
                sub="vs 30 j précédents"
                delay={180}
              />
              <KpiCard
                label="Non utilisés"
                value={(global?.ticketsUnused ?? 0).toLocaleString('fr-FR')}
                pct={null}
                sub={global && global.ticketsSold > 0
                  ? `${Math.round((global.ticketsUnused / global.ticketsSold) * 100)} % des ventes`
                  : undefined}
                delay={240}
              />
            </>
          )}
        </div>

        {/* ── Chart + insights ─────────────────────────────────────────────── */}
        <div className="dash-main">

          <div className="card">
            <div className="dash-chart__header">
              <div>
                <h3 className="dash-chart__title">Revenus par zone</h3>
                <p className="dash-chart__sub muted">Top 8 zones · toutes périodes</p>
              </div>
              <span className="pill">{formatCurrency(global?.revenue ?? 0)}</span>
            </div>
            {loading
              ? <div className="dash-skel" style={{ height: 220, borderRadius: 12 }} />
              : <RevenueChart data={chartData} />
            }
          </div>

          <div className="dash-insights">

            <InsightCard eyebrow="🏆 Top match">
              {loading ? (
                <>
                  <div className="dash-skel" style={{ height: 18, marginBottom: 8 }} />
                  <div className="dash-skel" style={{ height: 13, width: '60%', marginBottom: 8 }} />
                  <div className="dash-skel" style={{ height: 22, width: '50%' }} />
                </>
              ) : topMatch ? (
                <>
                  <div className="dash-insight__name">{topMatch.label}</div>
                  <div className="dash-insight__sub">
                    {topMatch.ticketsSold.toLocaleString('fr-FR')} tickets vendus
                  </div>
                  <div className="dash-insight__revenue">{formatCurrency(topMatch.revenue)}</div>
                </>
              ) : (
                <div className="dash-insight__sub">Aucune donnée match disponible</div>
              )}
            </InsightCard>

            <InsightCard eyebrow="📍 Top zone">
              {loading ? (
                <>
                  <div className="dash-skel" style={{ height: 18, marginBottom: 8 }} />
                  <div className="dash-skel" style={{ height: 13, width: '60%', marginBottom: 8 }} />
                  <div className="dash-skel" style={{ height: 22, width: '50%' }} />
                </>
              ) : topZone ? (
                <>
                  <div className="dash-insight__name">{topZone.label}</div>
                  <div className="dash-insight__sub">
                    {topZone.matchesCount} match{topZone.matchesCount !== 1 ? 's' : ''} · {topZone.ticketsSold.toLocaleString('fr-FR')} tickets
                  </div>
                  <div className="dash-insight__revenue">{formatCurrency(topZone.revenue)}</div>
                </>
              ) : (
                <div className="dash-insight__sub">Aucune donnée zone disponible</div>
              )}
            </InsightCard>

            <InsightCard eyebrow="📊 Taux de remplissage">
              {loading
                ? <div className="dash-skel" style={{ height: 56 }} />
                : <FillGauge
                    scanned={global?.ticketsScanned ?? 0}
                    sold={global?.ticketsSold ?? 0}
                  />
              }
            </InsightCard>

          </div>
        </div>

        {/* ── Analytics avancés ─────────────────────────────────────────── */}
        <div className="dash-analytics-section">
          <h2 className="dash-analytics-section__title">Analytics avancés</h2>

          {/* Ventes par match */}
          <div className="panel stack">
            <div className="toolbar">
              <div>
                <h3 style={{ margin: 0 }}>Ventes par match</h3>
                <p className="muted" style={{ margin: '4px 0 0' }}>
                  {analyticsLoading
                    ? 'Chargement…'
                    : `${analytics?.matchStats.length ?? 0} match${(analytics?.matchStats.length ?? 0) !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Match</th>
                    <th>Zone</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Tickets</th>
                    <th style={{ textAlign: 'right' }}>Revenus</th>
                    <th style={{ textAlign: 'right' }}>Scannés</th>
                    <th style={{ minWidth: 150 }}>Remplissage</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <td key={j}><div className="dash-skel" style={{ height: 14 }} /></td>
                          ))}
                        </tr>
                      ))
                    : analytics?.matchStats.length
                    ? analytics.matchStats.map((m) => {
                        const fillColor = m.fillRate >= 90 ? '#dc2626' : m.fillRate >= 70 ? '#f59e0b' : '#0f766e';
                        return (
                          <tr key={m.matchId}>
                            <td style={{ fontWeight: 600 }}>{m.label}</td>
                            <td><span className="muted" style={{ fontSize: 12 }}>{m.zone}</span></td>
                            <td>
                              <span className="muted" style={{ fontSize: 12 }}>
                                {new Date(m.matchDate).toLocaleDateString('fr-FR', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                })}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>{m.ticketsSold.toLocaleString('fr-FR')}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(m.revenue)}</td>
                            <td style={{ textAlign: 'right' }}>{m.ticketsScanned.toLocaleString('fr-FR')}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div className="anl-fill-bar">
                                  <div className="anl-fill-fill" style={{ width: `${m.fillRate}%`, background: fillColor }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: fillColor, minWidth: 34, textAlign: 'right' }}>
                                  {m.fillRate}&nbsp;%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    : (
                      <tr>
                        <td colSpan={7} className="empty">Aucune donnée disponible.</td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2-col : catégories + agents */}
          <div className="dash-analytics-grid">

            {/* Ventes par catégorie */}
            <div className="card">
              <h3 style={{ margin: '0 0 18px' }}>Ventes par catégorie</h3>
              {analyticsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div className="dash-skel" style={{ height: 13, width: '55%', marginBottom: 6 }} />
                    <div className="dash-skel" style={{ height: 8 }} />
                  </div>
                ))
              ) : analytics?.categoryStats.length ? (
                (() => {
                  const maxRev = Math.max(...analytics.categoryStats.map((c) => c.revenue), 1);
                  return analytics.categoryStats.map((cat) => (
                    <div key={cat.name} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{cat.name}</span>
                        <span className="muted" style={{ fontSize: 12 }}>
                          {cat.ticketsSold.toLocaleString('fr-FR')} tickets · {formatCurrency(cat.revenue)}
                        </span>
                      </div>
                      <div className="anl-fill-bar" style={{ height: 8 }}>
                        <div
                          className="anl-fill-fill"
                          style={{ width: `${Math.round((cat.revenue / maxRev) * 100)}%`, background: '#0f766e' }}
                        />
                      </div>
                    </div>
                  ));
                })()
              ) : (
                <div className="empty" style={{ padding: '8px 0' }}>Aucune vente enregistrée.</div>
              )}
            </div>

            {/* Performance agents de scan */}
            <div className="card">
              <h3 style={{ margin: '0 0 18px' }}>Performance agents de scan</h3>
              {analyticsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="dash-skel" style={{ height: 36, marginBottom: 8 }} />
                ))
              ) : analytics?.agentStats.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Agent</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                        <th style={{ textAlign: 'right' }}>Valides</th>
                        <th style={{ textAlign: 'right' }}>Invalides</th>
                        <th>Dernier scan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.agentStats.map((a) => (
                        <tr key={a.agentId}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{a.agentName}</div>
                            <div className="muted" style={{ fontSize: 11 }}>{formatRole(a.agentRole)}</div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{a.totalScans}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{ color: '#0f766e', fontWeight: 600 }}>{a.validScans}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {a.invalidScans + a.alreadyUsedScans > 0 ? (
                              <span style={{ color: '#dc2626', fontWeight: 600 }}>
                                {a.invalidScans + a.alreadyUsedScans}
                              </span>
                            ) : (
                              <span className="muted">0</span>
                            )}
                          </td>
                          <td>
                            <span className="muted" style={{ fontSize: 12 }}>
                              {a.lastScan
                                ? new Date(a.lastScan).toLocaleDateString('fr-FR', {
                                    day: '2-digit', month: 'short',
                                  })
                                : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty" style={{ padding: '8px 0' }}>Aucun scan enregistré.</div>
              )}
            </div>

          </div>
        </div>

      </AdminGuard>
    </PageShell>
  );
}

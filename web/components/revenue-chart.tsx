'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';

export type RevenueRow = { label: string; revenue: number; tickets: number };

function fmt(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; payload: RevenueRow }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(145,122,79,0.16)',
      borderRadius: 14,
      padding: '12px 16px',
      boxShadow: '0 8px 24px rgba(29,26,20,0.12)',
      minWidth: 160,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: 12, color: '#6a6253' }}>
        <span>Revenus</span>
        <span style={{ fontWeight: 700, color: '#0f766e' }}>
          {new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(row.revenue)}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, fontSize: 12, color: '#6a6253', marginTop: 4 }}>
        <span>Tickets</span>
        <span style={{ fontWeight: 600 }}>{row.tickets}</span>
      </div>
    </div>
  );
}

export function RevenueChart({ data }: { data: RevenueRow[] }) {
  if (!data.length) {
    return (
      <div style={{ height: 220, display: 'grid', placeItems: 'center', color: '#6a6253', fontSize: 14 }}>
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="2 4" stroke="rgba(145,122,79,0.1)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#6a6253', fontSize: 11, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={{ fill: '#6a6253', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={fmt}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(15,118,110,0.06)', radius: 8 }} />
        <Bar dataKey="revenue" radius={[7, 7, 0, 0]} maxBarSize={52}>
          {data.map((entry, i) => (
            <Cell
              key={entry.label}
              fill={i === 0 ? '#0f766e' : `rgba(15,118,110,${0.78 - i * 0.08})`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

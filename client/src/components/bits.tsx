import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Maturity } from '../data/estate';
import { Chip } from './ui';
import { cx } from '../lib/format';

// Single-hue sparkline (sequential magnitude; no categorical colour needed).
export function Sparkline({ values, width = 96, height = 24, stroke = 'var(--ink-soft)' }: { values: number[]; width?: number; height?: number; stroke?: string }) {
  const max = Math.max(1, ...values);
  const step = width / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(height - 2 - (v / max) * (height - 4)).toFixed(1)}`).join(' ');
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width.toString()} ${height.toString()}`} role="img" aria-label={`${total.toString()} runs over 30 days`}>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Kpi({ label, value, sub, to }: { label: string; value: ReactNode; sub?: ReactNode; to?: string }) {
  const body = (
    <>
      <div className="text-xs text-[var(--ink-faint)]">{label}</div>
      <div className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[var(--ink-soft)]">{sub}</div>}
    </>
  );
  const cls = 'rounded-xl border border-[var(--line)] bg-white px-4 py-3';
  return to ? (
    <Link to={to} className={cx(cls, 'block transition hover:border-[var(--brand-line)]')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function MaturityBadge({ status }: { status: Maturity }) {
  return <Chip tone={status === 'GA' ? 'ok' : status === 'Beta' ? 'warn' : 'info'}>{status}</Chip>;
}

export function Bars({ rows, format = (n: number) => n.toLocaleString() }: { rows: { label: string; value: number; to?: string }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[9rem_1fr_4.5rem] items-center gap-3 text-sm">
          {r.to ? (
            <Link to={r.to} className="truncate hover:underline" title={r.label}>
              {r.label}
            </Link>
          ) : (
            <span className="truncate" title={r.label}>
              {r.label}
            </span>
          )}
          <div className="h-2.5 rounded-r-[4px] bg-[var(--ink-soft)]/80" style={{ width: `${((r.value / max) * 100).toString()}%` }} />
          <span className="text-right text-xs tabular-nums text-[var(--ink-soft)]">{format(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold">{children}</h2>
      {right}
    </div>
  );
}

import { Activity, ArrowRight, GitBranch, Radio, Server, ShieldCheck } from 'lucide-react';
import { IT_BANDS, IT_GUARDRAILS, IT_STAGES, IT_STATS, IT_SYSTEMS, IT_TICKETS, IT_TRIGGER } from '../data/itservice';
import { Chip } from './ui';
import { cx } from '../lib/format';

const BAND_TONE = { ok: 'var(--ok)', warn: 'var(--warn)', deny: 'var(--deny)' } as const;
const OUTCOME_TONE = { 'Auto-resolved': 'ok', Assisted: 'warn', Escalated: 'deny' } as const;

// The continuous flow, connected systems, decision framework and guardrails.
export function OperatingModel() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--ink-soft)]">
        A standing pod, not a one-shot. It runs continuously against the ticket stream — resolving the safe, known
        fixes and escalating the rest — with a person on the loop, never out of it.
      </p>

      {/* Connected systems */}
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
          <Server className="h-3.5 w-3.5" /> Connected systems
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {IT_SYSTEMS.map((s) => (
            <div key={s.name} className="rounded-lg border border-[var(--line)] bg-white p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold">{s.name}</span>
                {s.name === 'ServiceNow' && <Chip tone="brand">ticket system</Chip>}
              </div>
              <div className="text-[11px] text-[var(--ink-faint)]">{s.via}</div>
              <div className="mt-1.5 font-mono text-[11px] leading-snug text-[var(--ink-soft)]">{s.used}</div>
            </div>
          ))}
        </div>
      </div>

      {/* The continuous loop */}
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
          <Radio className="h-3.5 w-3.5" /> Trigger · {IT_TRIGGER}
        </div>
        <div className="flex flex-wrap items-stretch gap-1.5">
          {IT_STAGES.map((st, i) => (
            <div key={st.key} className="flex items-stretch gap-1.5">
              <div
                className={cx(
                  'w-[8.5rem] rounded-lg border p-2.5',
                  st.decision ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[var(--line)] bg-white',
                )}
                title={st.note}
              >
                <div className="flex items-center gap-1 text-sm font-semibold">
                  {st.decision && <GitBranch className="h-3.5 w-3.5 text-[var(--brand-strong)]" />}
                  {st.label}
                </div>
                {st.via && <div className="text-[10px] text-[var(--ink-faint)]">{st.via}</div>}
                <div className="mt-1 text-[11px] leading-snug text-[var(--ink-soft)]">{st.note}</div>
              </div>
              {i < IT_STAGES.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 self-center text-[var(--ink-faint)]" />}
            </div>
          ))}
        </div>
      </div>

      {/* Decision bands */}
      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
          The decision · auto-resolve vs escalate
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {IT_BANDS.map((b) => (
            <div key={b.range} className="rounded-lg border border-[var(--line)] bg-white p-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: BAND_TONE[b.tone] }} />
                <span className="font-mono text-sm font-semibold">{b.range}</span>
              </div>
              <div className="text-[11px] text-[var(--ink-faint)]">{b.label}</div>
              <div className="mt-1 text-[13px] leading-snug">{b.action}</div>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--ink-faint)]">
          Confidence is calibrated on live tickets; thresholds start conservative and only relax as the no-reopen rate
          holds.
        </p>
      </div>

      {/* Guardrails */}
      <div className="flex flex-wrap items-start gap-2 rounded-lg bg-[var(--ok-soft)] px-3 py-2.5 text-sm text-[var(--ink-soft)]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ok)]" />
        <span>
          <b className="text-[var(--ink)]">Runtime guardrails.</b> {IT_GUARDRAILS.join(' · ')}.
        </span>
      </div>
    </div>
  );
}

// The operational output: a live queue of handled tickets and the standing KPIs — the IT equivalent
// of the dossier's document, but continuous.
export function OpsConsole() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-sm text-[var(--ink-soft)]">
        <Activity className="h-4 w-4 text-[var(--ok)]" />
        <b className="text-[var(--ink)]">Running continuously</b> · last ticket 40s ago · 30-day view
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {IT_STATS.map((s) => (
          <div key={s.label} className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5">
            <div className="text-xs text-[var(--ink-faint)]">{s.label}</div>
            <div className="mt-0.5 text-xl font-semibold tabular-nums">{s.value}</div>
            <div className="text-[11px] text-[var(--ink-soft)]">{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--line)]">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 bg-[var(--canvas)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
          <span>Ticket</span>
          <span>Summary</span>
          <span className="text-right">Confidence</span>
          <span className="text-right">Outcome</span>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {IT_TICKETS.map((t) => (
            <div key={t.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-3 py-2 text-sm">
              <span className="font-mono text-xs text-[var(--ink-faint)]">{t.id}</span>
              <span className="min-w-0">
                <span className="block truncate">{t.summary}</span>
                <span className="block truncate text-[11px] text-[var(--ink-faint)]">
                  {t.category} · {t.note}
                </span>
              </span>
              <span className="text-right font-mono text-xs tabular-nums text-[var(--ink-soft)]">
                {t.confidence.toFixed(2)}
              </span>
              <span className="text-right">
                <Chip tone={OUTCOME_TONE[t.outcome]}>{t.outcome}</Chip>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

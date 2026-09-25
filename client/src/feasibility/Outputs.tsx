import { useState, type ReactNode } from 'react';
import { Ban, CircleAlert, PhoneOutgoing } from 'lucide-react';
import type { RunDetail, WorkstreamRow } from '../../../shared/feasibility';
import { Chip } from '../components/ui';
import { cx } from '../lib/format';
import { api } from './api';

type ProtocolOut = { score: number; band: string; comparables: { trial_id: string; title: string; enrolment: string; duration: string; screen_fail: string; amendments: number; status: string }[]; metrics: Record<string, string | number>; components: Record<string, number>; projected_months: number; risks: string[] };
type Revision = { attempt: number; feedback: string; change: string };
type SitesOut = { therapeutic_area: string; candidates: { rank: number; site_id: string; name: string; location: string; investigator: string; score: number; enrolment_rate: number; diversity: string; inspection: string; flags: string[] }[]; excluded: { site_id: string; name: string; reason: string }[]; projected_rate: number; revision?: Revision };
type DiversityOut = { scope: string; goals: { group: string; epidemiology: string; projected_from_sites: string; goal: string; gap: string }[]; tactics: { group: string; tactic: string; gap: string }[]; monitoring: string; guidance: string[]; revision?: Revision };
type DrafterOut = { doc_id: string; version: number; sha256: string; content: string; estimand: { population: string; treatment: string; variable: string; intercurrent_events: { event: string; strategy: string }[]; summary: string }; checklist: string[]; revision?: Revision };

const COMPONENT_MAX: Record<string, number> = { enrolment: 35, timeline: 25, screening: 20, stability: 20 };

function RevisionNote({ r }: { r?: Revision }) {
  if (!r) return null;
  return (
    <div className="mb-3 rounded-lg border border-[var(--warn)] bg-[var(--warn-soft)] px-3 py-2 text-sm">
      <b>Attempt {r.attempt}</b> after “Request changes”: <span className="italic">“{r.feedback}”</span>
      <div className="text-xs text-[var(--ink-soft)]">{r.change}</div>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number | ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--line)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--canvas)] text-left text-xs text-[var(--ink-soft)]">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Protocol({ o }: { o: ProtocolOut }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-6">
        <div>
          <div className="text-5xl font-semibold tabular-nums">{o.score}</div>
          <div className="text-xs text-[var(--ink-soft)]">feasibility / 100</div>
        </div>
        <div className="min-w-[14rem] flex-1 space-y-1.5">
          {Object.entries(o.components).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 text-xs">
              <span className="w-20 capitalize text-[var(--ink-soft)]">{k}</span>
              <div className="h-2 flex-1 rounded-full bg-[#ebe4de]">
                <div className="h-2 rounded-full bg-[var(--brand)]" style={{ width: `${((v / (COMPONENT_MAX[k] ?? 25)) * 100).toString()}%` }} />
              </div>
              <span className="w-12 text-right tabular-nums">
                {v}/{COMPONENT_MAX[k] ?? 25}
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <Chip tone={o.score >= 75 ? 'ok' : 'warn'}>{o.band}</Chip>
          <div className="text-xs text-[var(--ink-soft)]">Projected enrolment ≈ {o.projected_months} months</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {Object.entries(o.metrics).map(([k, v]) => (
          <div key={k} className="rounded-lg bg-[var(--canvas)] px-3 py-2">
            <div className="text-lg font-semibold tabular-nums">{v}</div>
            <div className="text-[11px] text-[var(--ink-soft)]">{k}</div>
          </div>
        ))}
      </div>
      <ul className="space-y-1 text-sm">
        {o.risks.map((r) => (
          <li key={r} className="flex gap-1.5">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--warn)]" /> {r}
          </li>
        ))}
      </ul>
      <Table head={['Comparable trial', 'Enrolment', 'Duration', 'Screen fail', 'Amend.', 'Status']} rows={o.comparables.map((t) => [<span key="t"><span className="font-mono text-xs">{t.trial_id}</span> {t.title}</span>, t.enrolment, t.duration, t.screen_fail, t.amendments, t.status])} />
    </div>
  );
}

function Sites({ o, d, gateOpen }: { o: SitesOut; d: RunDetail; gateOpen: boolean }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const contact = async (id: string) => {
    try {
      await api.contact(d.run.run_id, id);
      setMsg({ ok: true, text: `${id} marked contacted in the site database` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    }
  };
  return (
    <div className="space-y-3">
      <RevisionNote r={o.revision} />
      <div className="text-sm text-[var(--ink-soft)]">
        {o.candidates.length} ranked candidates · {o.therapeutic_area} · combined historical rate {o.projected_rate} participants/month
      </div>
      {msg && <div className={cx('rounded-lg px-3 py-2 text-xs', msg.ok ? 'bg-[var(--ok-soft)] text-[var(--ok)]' : 'bg-[var(--deny-soft)] text-[var(--deny)]')}>{msg.text}</div>}
      <Table
        head={['#', 'Site', 'Score', 'Rate/mo', 'Diversity', 'Inspection', 'Flags', '']}
        rows={o.candidates.map((c) => {
          const done = d.contacted.includes(c.site_id);
          return [
            c.rank,
            <span key="s" className="block min-w-[13rem]" title={`Principal investigator: ${c.investigator}`}>
              <span className="font-medium">{c.name}</span>
              <span className="block text-xs text-[var(--ink-faint)]">
                {c.site_id} · {c.location}
              </span>
            </span>,
            <b key="sc" className="tabular-nums">{c.score}</b>,
            c.enrolment_rate,
            c.diversity,
            <Chip key="i" tone={c.inspection === 'NAI' ? 'ok' : 'warn'}>{c.inspection}</Chip>,
            c.flags.length ? <span key="f" className="block min-w-[10rem] text-xs text-[var(--warn)]">{c.flags.join('; ')}</span> : '—',
            done ? (
              <Chip key="c" tone="ok">Contacted</Chip>
            ) : (
              <button key="c" type="button" onClick={() => void contact(c.site_id)} title={gateOpen ? 'Mark contacted' : 'Blocked until the Site Selection Lead signs off'} className={cx('flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-1 text-xs', gateOpen ? 'border-[var(--brand)] text-[var(--brand-strong)] hover:bg-[var(--brand-soft)]' : 'border-[var(--line)] text-[var(--ink-faint)]')}>
                {gateOpen ? <PhoneOutgoing className="h-3 w-3" /> : <Ban className="h-3 w-3" />} Mark contacted
              </button>
            ),
          ];
        })}
      />
      {o.excluded.length > 0 && (
        <div className="text-xs text-[var(--ink-soft)]">
          <b>Excluded:</b> {o.excluded.map((e) => `${e.site_id} ${e.name} (${e.reason})`).join(' · ')}
        </div>
      )}
    </div>
  );
}

function Diversity({ o }: { o: DiversityOut }) {
  return (
    <div className="space-y-3">
      <RevisionNote r={o.revision} />
      <div className="text-sm text-[var(--ink-soft)]">{o.scope}</div>
      <Table head={['Group', 'Epidemiology', 'Projected from sites', 'Enrolment goal', 'Gap']} rows={o.goals.map((g) => [g.group, g.epidemiology, g.projected_from_sites, <b key="g">{g.goal}</b>, g.gap === '—' ? '—' : <span key="gap" className="text-[var(--warn)]">{g.gap}</span>])} />
      <div>
        <div className="mb-1 text-sm font-semibold">Tactics for gaps</div>
        <ul className="space-y-1 text-sm">
          {o.tactics.map((t) => (
            <li key={t.group + t.tactic}>
              <b>{t.group}</b>
              {t.gap && <span className="text-[var(--ink-faint)]"> (gap {t.gap})</span>}: {t.tactic}
            </li>
          ))}
        </ul>
      </div>
      <div className="text-sm">
        <b>Monitoring:</b> {o.monitoring}
      </div>
      <div className="text-xs text-[var(--ink-soft)]">Guidance used: {o.guidance.join(' · ')}</div>
    </div>
  );
}

function Drafter({ o }: { o: DrafterOut }) {
  return (
    <div className="space-y-3">
      <RevisionNote r={o.revision} />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Chip tone="brand">
          {o.doc_id} · v{o.version}
        </Chip>
        <span className="font-mono text-[var(--ink-faint)]">sha256 {o.sha256.slice(0, 20)}…</span>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {(
          [
            ['Population', o.estimand.population],
            ['Treatment', o.estimand.treatment],
            ['Variable (endpoint)', o.estimand.variable],
            ['Population-level summary', o.estimand.summary],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="rounded-lg bg-[var(--canvas)] px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">{k}</div>
            <div className="text-sm">{v}</div>
          </div>
        ))}
      </div>
      <Table head={['Intercurrent event', 'Strategy']} rows={o.estimand.intercurrent_events.map((e) => [e.event, e.strategy])} />
      <details className="rounded-lg border border-[var(--line)]">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Document text (as committed)</summary>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap border-t border-[var(--line)] bg-[var(--canvas)] p-3 font-mono text-xs">{o.content}</pre>
      </details>
    </div>
  );
}

export function WorkstreamOutput({ w, d }: { w: WorkstreamRow; d: RunDetail }) {
  if (!w.output) return <div className="rounded-lg border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--ink-faint)]">The agent is working. Its output appears here when it finishes.</div>;
  const o = w.output;
  if (w.ws_key === 'protocol') return <Protocol o={o as ProtocolOut} />;
  if (w.ws_key === 'sites') return <Sites o={o as SitesOut} d={d} gateOpen={w.state === 'approved' || w.state === 'complete'} />;
  if (w.ws_key === 'diversity') return <Diversity o={o as DiversityOut} />;
  return <Drafter o={o as DrafterOut} />;
}

// One-line summary for dashboard cards.
export function outputSummary(w: WorkstreamRow): string {
  const o = w.output;
  if (!o) return '';
  if (w.ws_key === 'protocol') return `${String((o as ProtocolOut).score)}/100 · ${(o as ProtocolOut).band}`;
  if (w.ws_key === 'sites') return `${(o as SitesOut).candidates.length.toString()} sites ranked · ${(o as SitesOut).excluded.length.toString()} excluded`;
  if (w.ws_key === 'diversity') return `${(o as DiversityOut).goals.length.toString()} goals · ${(o as DiversityOut).tactics.length.toString()} tactics`;
  return `${(o as DrafterOut).doc_id} v${String((o as DrafterOut).version)}`;
}

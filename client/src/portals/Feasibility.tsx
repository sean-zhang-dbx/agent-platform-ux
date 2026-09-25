import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router';
import { ArrowRight, Bot, CheckCircle2, Database, FileCheck2, Fingerprint, Lock, Network, PenLine, Play, Printer, RotateCcw, ShieldAlert, ShieldCheck, UserCheck } from 'lucide-react';
import { PRESETS, PROGRAM_LEAD, WORKSTREAMS, wsMeta, type AuditRow, type RunDetail, type RunRow, type WsKey } from '../../../shared/feasibility';
import { Chip, PageHeader, Panel, PrimaryButton, SecondaryButton } from '../components/ui';
import { cx } from '../lib/format';
import { api, shortHash, useRun, when } from '../feasibility/api';
import { EventList, RUN_LABEL, SignForm, StateChip, Stepper } from '../feasibility/parts';
import { WorkstreamOutput, outputSummary } from '../feasibility/Outputs';

// ── Runs list ─────────────────────────────────────────────────────────────────
export function FeasibilityHome() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<RunRow[] | null>(null);
  const [preset, setPreset] = useState(PRESETS[0].id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.runs().then(setRuns, (e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  const start = async () => {
    setBusy(true);
    try {
      const { run_id } = await api.create(preset);
      void navigate(`/feasibility/${run_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Trial feasibility" sub="Four agents work in parallel. Three stop at a named person's e-signature. The Program Lead releases the package, which locks the record." />
      <Panel className="mb-5 p-5">
        <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <FlowStrip />
          <div className="flex flex-wrap items-center gap-2">
            <select value={preset} onChange={(e) => setPreset(e.target.value)} aria-label="Study" className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm">
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.studyId} · {p.title}
                </option>
              ))}
            </select>
            <PrimaryButton onClick={() => void start()} disabled={busy}>
              <Play className="h-4 w-4" /> Start evaluation
            </PrimaryButton>
          </div>
        </div>
      </Panel>
      {error && <Panel className="mb-4 bg-[var(--deny-soft)] p-3 text-sm text-[var(--deny)]">{error}</Panel>}
      <Panel className="overflow-hidden">
        <div className="border-b border-[var(--line)] px-4 py-3 text-sm font-semibold">Evaluations</div>
        {runs === null ? (
          <div className="p-6 text-sm text-[var(--ink-faint)]">Loading…</div>
        ) : runs.length === 0 ? (
          <div className="p-6 text-sm text-[var(--ink-faint)]">No evaluations yet. Start one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--canvas)] text-left text-xs text-[var(--ink-soft)]">
              <tr>
                <th className="px-4 py-2 font-medium">Run</th>
                <th className="px-4 py-2 font-medium">Study</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="hidden px-4 py-2 font-medium md:table-cell">Started</th>
                <th className="hidden px-4 py-2 font-medium lg:table-cell">Package</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {runs.map((r) => (
                <tr key={r.run_id} onClick={() => void navigate(`/feasibility/${r.run_id}`)} className="cursor-pointer hover:bg-[var(--canvas)]">
                  <td className="px-4 py-2.5 font-mono text-xs">{r.run_id}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{r.study_id}</div>
                    <div className="text-xs text-[var(--ink-faint)]">{r.title}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <Chip tone={RUN_LABEL[r.status].tone}>
                      {r.locked && <Lock className="h-3 w-3" />}
                      {RUN_LABEL[r.status].text}
                    </Chip>
                  </td>
                  <td className="hidden px-4 py-2.5 text-xs text-[var(--ink-soft)] md:table-cell">
                    {when(r.created_at)} · {r.created_by}
                  </td>
                  <td className="hidden px-4 py-2.5 font-mono text-xs text-[var(--ink-faint)] lg:table-cell">{shortHash(r.package_hash)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

function FlowStrip() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="flex items-center gap-1.5 rounded-lg bg-[#1f1d1b] px-2.5 py-1.5 font-medium text-white">
        <Network className="h-3.5 w-3.5 text-[var(--brand)]" /> Orchestrator
      </span>
      <ArrowRight className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
      <div className="flex flex-wrap gap-1.5">
        {WORKSTREAMS.map((w) => (
          <span key={w.key} className="flex items-center gap-1 rounded-lg border border-[var(--line)] bg-white px-2 py-1.5">
            <Bot className="h-3.5 w-3.5 text-[var(--ink-soft)]" />
            {w.agent.replace(' Agent', '')}
            {w.gate ? (
              <span className="ml-1 flex items-center gap-0.5 rounded bg-[var(--warn-soft)] px-1 text-[10px] font-medium text-[var(--warn)]">
                <PenLine className="h-2.5 w-2.5" /> gate
              </span>
            ) : (
              <span className="ml-1 rounded bg-[#f3efeb] px-1 text-[10px] text-[var(--ink-soft)]">auto</span>
            )}
          </span>
        ))}
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
      <span className="flex items-center gap-1.5 rounded-lg border border-[var(--brand)] bg-[var(--brand-soft)] px-2.5 py-1.5 font-medium">
        <UserCheck className="h-3.5 w-3.5 text-[var(--brand)]" /> {PROGRAM_LEAD.role} releases
      </span>
    </div>
  );
}

// ── Run shell ─────────────────────────────────────────────────────────────────
function RunHeader({ d }: { d: RunDetail }) {
  const r = d.run;
  const tab = (to: string, label: string, badge?: number) => (
    <NavLink end to={to} className={({ isActive }) => cx('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium', isActive ? 'bg-white shadow-sm' : 'text-[var(--ink-soft)]')}>
      {label}
      {badge ? <span className="rounded-full bg-[var(--warn)] px-1.5 text-[10px] font-semibold text-white">{badge}</span> : null}
    </NavLink>
  );
  const waiting = d.workstreams.filter((w) => w.state === 'awaiting_approval').length;
  return (
    <>
      <Link to="/feasibility" className="mb-3 inline-block text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]">
        ← Trial feasibility
      </Link>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{r.study_id}</h1>
        <Chip tone={RUN_LABEL[r.status].tone}>
          {r.locked && <Lock className="h-3 w-3" />}
          {RUN_LABEL[r.status].text}
        </Chip>
        <span className="font-mono text-xs text-[var(--ink-faint)]">{r.run_id}</span>
      </div>
      <p className="mb-4 text-sm text-[var(--ink-soft)]">
        {r.title} · {r.compound} · target N = {r.target_enrollment.toLocaleString()} · started {when(r.created_at)} by {r.created_by}
      </p>
      {r.locked && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--ok)] bg-[var(--ok-soft)] px-4 py-3 text-sm">
          <Lock className="h-4 w-4 text-[var(--ok)]" />
          <b>Released and locked</b> by {r.released_by} on {when(r.released_at)} · package sha256 <span className="font-mono text-xs">{shortHash(r.package_hash, 16)}</span>. Further changes to this run are refused.
        </div>
      )}
      <div className="mb-5 flex w-fit flex-wrap gap-1 rounded-xl bg-[#f3efeb] p-1">
        {tab(`/feasibility/${r.run_id}`, 'Dashboard', waiting)}
        {tab(`/feasibility/${r.run_id}/audit`, `Audit log (${d.audit.length.toString()})`)}
        {tab(`/feasibility/${r.run_id}/release`, 'Release')}
      </div>
    </>
  );
}

function Loading({ error }: { error: string | null }) {
  return <Panel className="p-10 text-center text-sm text-[var(--ink-soft)]">{error ?? 'Loading…'}</Panel>;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function FeasibilityRunPage() {
  const { runId } = useParams();
  const { data: d, error } = useRun(runId);
  if (!d) return <Loading error={error} />;
  const orchestrator = d.events.filter((e) => e.ws_key === null);
  const complete = d.workstreams.filter((w) => w.state === 'complete').length;

  return (
    <div>
      <RunHeader d={d} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-4 md:grid-cols-2">
          {d.workstreams.map((w) => {
            const m = wsMeta(w.ws_key);
            const last = [...d.events].reverse().find((e) => e.ws_key === w.ws_key);
            return (
              <Link key={w.ws_key} to={`/feasibility/${d.run.run_id}/ws/${w.ws_key}`} className={cx('block rounded-xl border bg-white p-4 transition hover:shadow-md', w.state === 'awaiting_approval' ? 'border-2 border-[var(--warn)]' : w.state === 'rejected' ? 'border-2 border-[var(--deny)]' : 'border-[var(--line)]')}>
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Bot className="h-4 w-4 text-[var(--brand)]" /> {m.agent}
                    </div>
                    <div className="text-xs text-[var(--ink-soft)]">{m.purpose}</div>
                  </div>
                  <StateChip state={w.state} />
                </div>
                <Stepper state={w.state} gated={m.gate !== null} />
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-soft)]">
                  <span className="flex items-center gap-1">
                    <Database className="h-3.5 w-3.5" /> {m.system}
                  </span>
                  {m.gate ? (
                    <span className="flex items-center gap-1">
                      <PenLine className="h-3.5 w-3.5" /> {m.gate.name} · {m.gate.role}
                    </span>
                  ) : (
                    <span>Autonomous · no gate</span>
                  )}
                  {w.attempt > 1 && <Chip tone="warn">Attempt {w.attempt}</Chip>}
                </div>
                <div className="mt-3 min-h-[2.5rem] rounded-lg bg-[var(--canvas)] px-3 py-2 text-xs">
                  {w.output ? <b className="text-[var(--ink)]">{outputSummary(w)}</b> : <span className="text-[var(--ink-faint)]">{last?.text ?? 'Queued by the orchestrator'}</span>}
                  {w.output && last && <div className="truncate text-[var(--ink-faint)]">{last.text}</div>}
                </div>
                {w.state === 'awaiting_approval' && (
                  <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--warn)] py-2 text-sm font-semibold text-white">
                    <PenLine className="h-4 w-4" /> Review and e-sign
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        <div className="space-y-4">
          <Panel className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <Network className="h-4 w-4 text-[var(--brand)]" /> Orchestrator
              </div>
              <span className="text-xs tabular-nums text-[var(--ink-soft)]">{complete}/4 complete</span>
            </div>
            <div className="mb-3 h-2 rounded-full bg-[#ebe4de]">
              <div className="h-2 rounded-full bg-[var(--ok)] transition-all" style={{ width: `${(complete * 25).toString()}%` }} />
            </div>
            <EventList events={orchestrator} />
          </Panel>
          <Panel className={cx('p-4', d.run.status === 'awaiting_release' && 'border-2 border-[var(--brand)]')}>
            <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
              <FileCheck2 className="h-4 w-4 text-[var(--brand)]" /> Feasibility package
            </div>
            <div className="mb-3 text-xs text-[var(--ink-soft)]">
              {d.run.locked ? `Released by ${d.run.released_by ?? ''}.` : d.run.status === 'awaiting_release' ? `Assembled. Waiting for ${PROGRAM_LEAD.name}.` : 'Assembled once all four workstreams are complete.'}
            </div>
            <Link to={`/feasibility/${d.run.run_id}/release`} className="flex items-center gap-1 text-sm font-medium text-[var(--brand-strong)] hover:underline">
              {d.run.locked ? 'View released package' : 'Open release'} <ArrowRight className="h-4 w-4" />
            </Link>
          </Panel>
          <Panel className="p-4">
            <div className="mb-2 text-sm font-semibold">All activity</div>
            <div className="max-h-72 overflow-y-auto pr-1">
              <EventList events={d.events.filter((e) => e.ws_key !== null)} max={40} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ── Workstream detail ─────────────────────────────────────────────────────────
export function FeasibilityWorkstreamPage() {
  const { runId, ws } = useParams();
  const { data: d, error, refresh } = useRun(runId);
  if (!d) return <Loading error={error} />;
  const w = d.workstreams.find((x) => x.ws_key === ws);
  if (!w) return <Loading error="Workstream not found" />;
  const m = wsMeta(w.ws_key);
  const history = d.audit.filter((a) => a.ws_key === w.ws_key);
  const events = d.events.filter((e) => e.ws_key === w.ws_key);
  const artifactRef = w.artifact_ref ?? `${d.run.run_id}/${w.ws_key}@attempt${w.attempt.toString()}`;

  return (
    <div>
      <RunHeader d={d} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Bot className="h-5 w-5 text-[var(--brand)]" /> {m.agent}
        </h2>
        <StateChip state={w.state} />
        {w.attempt > 1 && <Chip tone="warn">Attempt {w.attempt}</Chip>}
        <span className="text-sm text-[var(--ink-soft)]">{m.gate ? `Gate: ${m.gate.name} · ${m.gate.role}` : 'Autonomous · no gate'}</span>
      </div>
      <div className="mb-5 max-w-md">
        <Stepper state={w.state} gated={m.gate !== null} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          {w.state === 'awaiting_approval' && m.gate && (
            <SignForm
              mode="gate"
              reviewer={m.gate}
              artifactRef={artifactRef}
              artifactHash={w.output_hash ?? ''}
              onSubmit={async (x) => {
                if (x.decision === 'release') return;
                await api.decide(d.run.run_id, w.ws_key, { decision: x.decision, signature: x.signature, comment: x.comment, confirm: x.confirm });
                await refresh();
              }}
            />
          )}
          {w.state === 'rejected' && !d.run.locked && (
            <Panel className="flex flex-wrap items-center justify-between gap-3 border-2 border-[var(--deny)] p-4">
              <div className="text-sm">
                <b>Rejected</b>: “{w.feedback}”. The package can’t be assembled until this workstream is re-run and approved. The rejection stays in the audit log.
              </div>
              <SecondaryButton
                onClick={() => {
                  void api.rerun(d.run.run_id, w.ws_key).then(refresh);
                }}
              >
                <RotateCcw className="h-4 w-4" /> Re-run workstream
              </SecondaryButton>
            </Panel>
          )}
          <Panel className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold">Agent output</div>
              {w.output_hash && <span className="font-mono text-[11px] text-[var(--ink-faint)]">sha256 {shortHash(w.output_hash, 16)}</span>}
            </div>
            <WorkstreamOutput w={w} d={d} />
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel className="p-4">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <Database className="h-4 w-4 text-[#4a3aa7]" /> System data used
            </div>
            {w.sources.length === 0 ? (
              <div className="text-xs text-[var(--ink-faint)]">Nothing read yet.</div>
            ) : (
              <ul className="space-y-3">
                {w.sources.map((s) => (
                  <li key={s.call} className="text-xs">
                    <div className="font-medium text-[var(--ink)]">{s.system}</div>
                    <div className="font-mono text-[11px] text-[#4a3aa7]">{s.call}</div>
                    <div className="text-[var(--ink-soft)]">
                      {s.records} records · <span className="font-mono">{s.table}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {s.ids.slice(0, 12).map((id) => (
                        <span key={id} className="rounded bg-[#f3efeb] px-1.5 py-0.5 font-mono text-[10px]">
                          {id}
                        </span>
                      ))}
                      {s.ids.length > 12 && <span className="text-[10px] text-[var(--ink-faint)]">+{s.ids.length - 12}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel className="p-4">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-[var(--ok)]" /> Approval history
            </div>
            {!m.gate ? (
              <div className="text-xs text-[var(--ink-faint)]">Autonomous workstream: no approvals required.</div>
            ) : history.length === 0 ? (
              <div className="text-xs text-[var(--ink-faint)]">No decisions yet.</div>
            ) : (
              <ol className="space-y-3">
                {history.map((a) => (
                  <AuditCard key={a.seq} a={a} />
                ))}
              </ol>
            )}
          </Panel>
          <Panel className="p-4">
            <div className="mb-2 text-sm font-semibold">Activity</div>
            <EventList events={events} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

const DECISION_TONE: Record<string, 'ok' | 'warn' | 'deny' | 'brand'> = { approve: 'ok', request_changes: 'warn', reject: 'deny', release: 'brand' };

function AuditCard({ a }: { a: AuditRow }) {
  return (
    <li className="rounded-lg border border-[var(--line)] p-3 text-xs">
      <div className="mb-1 flex items-center justify-between gap-2">
        <Chip tone={DECISION_TONE[a.decision] ?? 'neutral'}>{a.signature_meaning}</Chip>
        <span className="font-mono text-[var(--ink-faint)]">#{a.seq}</span>
      </div>
      <div className="font-serif text-sm italic">{a.signature_name}</div>
      <div className="text-[var(--ink-soft)]">
        {a.role} · {when(a.signed_at)} · attempt {a.attempt}
      </div>
      {a.comment && <div className="mt-1">“{a.comment}”</div>}
      <div className="mt-1 font-mono text-[10px] text-[var(--ink-faint)]">
        {a.artifact_ref} · {shortHash(a.artifact_hash, 12)}
      </div>
    </li>
  );
}

// ── Audit log ─────────────────────────────────────────────────────────────────
export function FeasibilityAuditPage() {
  const { runId } = useParams();
  const { data: d, error } = useRun(runId);
  const [ws, setWs] = useState('all');
  const [reviewer, setReviewer] = useState('all');
  const [verify, setVerify] = useState<{ ok: boolean; checked: number; brokenAt?: number } | null>(null);
  const [tamper, setTamper] = useState<{ blocked: boolean; message: string } | null>(null);
  const rows = useMemo(() => (d?.audit ?? []).filter((a) => (ws === 'all' || a.ws_key === ws) && (reviewer === 'all' || a.reviewer === reviewer)), [d, ws, reviewer]);
  if (!d) return <Loading error={error} />;
  const reviewers = [...new Set(d.audit.map((a) => a.reviewer))];

  return (
    <div>
      <div className="print:hidden">
        <RunHeader d={d} />
      </div>
      <Panel className="overflow-hidden print:border-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
          <div>
            <div className="font-semibold">Electronic record · gated decisions and release</div>
            <div className="text-xs text-[var(--ink-soft)]">
              {d.run.study_id} · {d.run.run_id} · generated {when(new Date().toISOString())} · append-only, hash-chained (<span className="font-mono">audit_log</span>, in-browser store)
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <select value={ws} onChange={(e) => setWs(e.target.value)} aria-label="Workstream" className="rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-sm">
              <option value="all">All workstreams</option>
              {WORKSTREAMS.filter((w) => w.gate).map((w) => (
                <option key={w.key} value={w.key}>
                  {w.agent}
                </option>
              ))}
              <option value="package">Package release</option>
            </select>
            <select value={reviewer} onChange={(e) => setReviewer(e.target.value)} aria-label="Reviewer" className="rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-sm">
              <option value="all">All reviewers</option>
              {reviewers.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <SecondaryButton onClick={() => void api.verify().then(setVerify)}>
              <Fingerprint className="h-4 w-4" /> Verify chain
            </SecondaryButton>
            <SecondaryButton onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </SecondaryButton>
          </div>
        </div>
        {(verify ?? tamper) && (
          <div className="space-y-1 border-b border-[var(--line)] px-4 py-2 text-xs print:hidden">
            {verify && (
              <div className={cx('flex items-center gap-1.5', verify.ok ? 'text-[var(--ok)]' : 'text-[var(--deny)]')}>
                {verify.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                {verify.ok ? `Chain intact: all ${verify.checked.toString()} records across every run recomputed and matched.` : `Chain broken at record #${String(verify.brokenAt)}.`}
              </div>
            )}
            {tamper && (
              <div className={cx('flex items-center gap-1.5', tamper.blocked ? 'text-[var(--ok)]' : 'text-[var(--deny)]')}>
                <ShieldCheck className="h-3.5 w-3.5" /> {tamper.blocked ? 'Edit refused by the store:' : 'Warning:'} <span className="font-mono">{tamper.message}</span>
              </div>
            )}
          </div>
        )}
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--ink-faint)]">No gated decisions recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--canvas)] text-left text-[var(--ink-soft)]">
                <tr>
                  {['#', 'Signed (UTC)', 'Workstream', 'Reviewer · role', 'Meaning', 'Rationale', 'Artifact', 'Signed as · account', 'Record hash'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {rows.map((a) => (
                  <tr key={a.seq} className="align-top">
                    <td className="px-3 py-2 font-mono">{a.seq}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono">{when(a.signed_at).replace(' UTC', '')}</td>
                    <td className="px-3 py-2">{a.ws_key === 'package' ? 'Package release' : wsMeta(a.ws_key).agent.replace(' Agent', '')}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{a.reviewer}</div>
                      <div className="text-[var(--ink-faint)]">{a.role}</div>
                    </td>
                    <td className="px-3 py-2">
                      <Chip tone={DECISION_TONE[a.decision] ?? 'neutral'}>{a.signature_meaning}</Chip>
                      <div className="mt-0.5 text-[var(--ink-faint)]">attempt {a.attempt}</div>
                    </td>
                    <td className="max-w-[16rem] px-3 py-2">{a.comment || <span className="text-[var(--ink-faint)]">—</span>}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">
                      <div>{a.artifact_ref}</div>
                      <div className="text-[var(--ink-faint)]">{shortHash(a.artifact_hash, 12)}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-serif italic">{a.signature_name}</div>
                      <div className="text-[var(--ink-faint)]">{a.authenticated_as}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px]">
                      <div>{shortHash(a.record_hash, 12)}</div>
                      <div className="text-[var(--ink-faint)]">prev {shortHash(a.prev_hash, 8)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] px-4 py-2 text-[11px] text-[var(--ink-faint)]">
          <span>Each record hashes the previous one, so any edit breaks the chain. Signatures are simulated (typed name + confirmation) for the prototype.</span>
          {d.audit[0] && (
            <button type="button" onClick={() => void api.tamper(Number(d.audit[0].seq)).then(setTamper)} className="rounded border border-[var(--line)] px-2 py-0.5 hover:text-[var(--ink)] print:hidden">
              Try to edit record #{d.audit[0].seq}
            </button>
          )}
        </div>
      </Panel>
    </div>
  );
}

// ── Release ───────────────────────────────────────────────────────────────────
export function FeasibilityReleasePage() {
  const { runId } = useParams();
  const { data: d, error, refresh } = useRun(runId);
  if (!d) return <Loading error={error} />;
  const r = d.run;
  const ready = r.status === 'awaiting_release' && r.package_hash;
  const signerOf = (k: WsKey) => [...d.audit].reverse().find((a) => a.ws_key === k && a.decision === 'approve');
  const release = d.audit.find((a) => a.record_type === 'release');

  return (
    <div>
      <RunHeader d={d} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Panel className="p-5">
          <div className="mb-1 flex items-center gap-1.5 font-semibold">
            <FileCheck2 className="h-5 w-5 text-[var(--brand)]" /> Feasibility package · {r.study_id}
          </div>
          <div className="mb-4 font-mono text-xs text-[var(--ink-faint)]">package sha256 {r.package_hash ?? 'assembled once all four workstreams are complete'}</div>
          <div className="divide-y divide-[var(--line)]">
            {d.workstreams.map((w) => {
              const m = wsMeta(w.ws_key);
              const s = signerOf(w.ws_key);
              return (
                <div key={w.ws_key} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link to={`/feasibility/${r.run_id}/ws/${w.ws_key}`} className="font-medium hover:underline">
                      {m.agent}
                    </Link>
                    <div className="text-sm text-[var(--ink-soft)]">{outputSummary(w) || '—'}</div>
                    <div className="font-mono text-[10px] text-[var(--ink-faint)]">
                      {w.artifact_ref ?? `${w.ws_key}@attempt${w.attempt.toString()}`} · {shortHash(w.output_hash, 12)}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <StateChip state={w.state} />
                    <div className="mt-1 text-[var(--ink-soft)]">{m.gate ? (s ? `Signed ${s.signature_name}, ${when(s.signed_at)}` : 'Not signed yet') : 'Autonomous'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="space-y-4">
          {r.locked && release ? (
            <Panel className="border-2 border-[var(--ok)] p-5">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <Lock className="h-5 w-5 text-[var(--ok)]" /> Released and locked
              </div>
              <div className="font-serif text-lg italic">{release.signature_name}</div>
              <div className="text-sm text-[var(--ink-soft)]">
                {release.role} · {when(release.signed_at)}
              </div>
              {release.comment && <div className="mt-2 text-sm">“{release.comment}”</div>}
              <div className="mt-3 font-mono text-[10px] text-[var(--ink-faint)]">
                audit #{release.seq} · {shortHash(release.record_hash, 16)}
              </div>
            </Panel>
          ) : ready ? (
            <SignForm
              mode="release"
              reviewer={PROGRAM_LEAD}
              artifactRef={`${r.run_id}/package`}
              artifactHash={r.package_hash ?? ''}
              onSubmit={async (x) => {
                await api.release(r.run_id, { signature: x.signature, comment: x.comment, confirm: x.confirm });
                await refresh();
              }}
            />
          ) : (
            <Panel className="p-5 text-sm text-[var(--ink-soft)]">
              <div className="mb-1 flex items-center gap-2 font-semibold text-[var(--ink)]">
                <Lock className="h-4 w-4" /> Not ready for release
              </div>
              {d.workstreams.filter((w) => w.state === 'complete').length}/4 workstreams complete. {PROGRAM_LEAD.name} can sign once all four are complete.
            </Panel>
          )}
          <Panel className="p-4 text-xs text-[var(--ink-soft)]">Release writes a final signed record to the audit log and sets the run to locked. After that, the store refuses any change to the run or its workstreams.</Panel>
        </div>
      </div>
    </div>
  );
}


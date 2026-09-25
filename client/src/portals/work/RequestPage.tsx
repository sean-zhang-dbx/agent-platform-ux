import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Ban, CircleCheck, LoaderCircle, OctagonAlert, PenLine, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useStore } from '../../state/store';
import { SRP_AGENTS, gatesForPod } from '../../data/pods';
import { SRA_ID, FLAGSHIP } from '../../data/capabilities';
import { capabilityById, podById, roleAgentById } from '../../data/estate';
import { reportFor } from '../../data/genericRun';
import { AGENT_FINDINGS, CITATIONS, EVIDENCE_ROWS, REPORT } from '../../data/report';
import type { WorkRequest } from '../../data/types';
import { Chip, Panel, PrimaryButton, SecondaryButton, Stat } from '../../components/ui';
import { ApprovalsRegister } from '../../components/Approvals';
import { DossierButton } from '../../components/DossierPreview';
import { cx, money } from '../../lib/format';
import { statusLabel } from '../Work';
import { ActivityList, RunCard, agentLabel } from '../chat/RunCard';
import { PodCard } from '../chat/PodCard';
import { AgentCard, RunAccessSummary } from '../agents/AgentCard';
import { personFor } from '../../data/access';

function Cite({ id }: { id: string }) {
  const c = CITATIONS.find((x) => x.id === id);
  return (
    <span title={c ? `${roleAgentById(c.agent)?.name ?? c.agent}: ${c.source}` : id} className="ml-1 cursor-help rounded bg-[var(--info-soft)] px-1 font-mono text-[10px] font-semibold text-[var(--info)]">
      {id}
    </span>
  );
}

function withCites(text: string) {
  const parts = text.split(/\[(C\d)\]/g);
  return parts.map((p, i) => (i % 2 === 1 ? <Cite key={`${p}-${i.toString()}`} id={p} /> : <span key={`t-${i.toString()}`}>{p}</span>));
}

function SignOff({ r }: { r: WorkRequest }) {
  const { decide } = useStore();
  const [comment, setComment] = useState('');
  const d = r.decision;
  const gates = gatesForPod(r.podId);
  if (!d && r.status === 'pending_approval' && gates.length > 0) {
    return (
      <Panel className="border-2 border-[var(--brand)] p-5">
        <div className="mb-3 flex items-center gap-2 font-semibold">
          <PenLine className="h-5 w-5 text-[var(--brand)]" /> Sign-off
        </div>
        <ApprovalsRegister r={r} gates={gates} />
      </Panel>
    );
  }
  return (
    <Panel className={cx('p-5', !d && 'border-2 border-[var(--brand)]')}>
      <div className="flex items-center gap-2 font-semibold">
        <PenLine className="h-5 w-5 text-[var(--brand)]" /> Sign-off
      </div>
      {d ? (
        <div className={cx('mt-3 rounded-lg p-3', d.decision === 'approved' ? 'bg-[var(--ok-soft)]' : d.decision === 'rejected' ? 'bg-[var(--deny-soft)]' : 'bg-[var(--warn-soft)]')}>
          <div className="font-semibold">{d.decision === 'approved' ? 'Approved' : d.decision === 'rejected' ? 'Rejected' : 'Changes requested'}</div>
          <div className="text-xs text-[var(--ink-soft)]">
            {d.by} · {d.at}
          </div>
          {d.comment && <div className="mt-1 text-sm italic">“{d.comment}”</div>}
        </div>
      ) : (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comment (optional)"
            rows={2}
            className="mt-3 w-full rounded-lg border border-[var(--line)] p-2.5 text-sm outline-none focus:border-[var(--brand)]"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <PrimaryButton onClick={() => decide(r.id, 'approved', comment)}>Approve</PrimaryButton>
            <SecondaryButton onClick={() => decide(r.id, 'changes_requested', comment)}>Request changes</SecondaryButton>
            <SecondaryButton onClick={() => decide(r.id, 'rejected', comment)}>Reject</SecondaryButton>
          </div>
        </>
      )}
    </Panel>
  );
}

function ReportTab({ r }: { r: WorkRequest }) {
  const flagship = r.capabilityId === SRA_ID;
  const rep = reportFor(capabilityById(r.capabilityId) ?? FLAGSHIP);
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <Panel className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-xs text-[var(--ink-faint)]">Draft · written by the pod · not signed</div>
            <div className="mt-1 text-3xl font-bold tracking-tight text-[var(--warn)]">{rep.recommendation}</div>
          </div>
          {flagship && <DossierButton />}
        </div>
        <div className="mt-1 text-sm text-[var(--ink-soft)]">{rep.detail}</div>

        <div className="mt-4 space-y-2">
          {rep.flags.map((f) => (
            <div key={f.text} className={cx('flex gap-2 rounded-lg px-3 py-2 text-sm', f.level === 'blocking' ? 'bg-[var(--deny-soft)] font-medium' : 'bg-[var(--warn-soft)]')}>
              {f.level === 'blocking' ? <OctagonAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--deny)]" /> : <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn)]" />}
              {f.text}
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-3 border-t border-[var(--line)] pt-4">
          {(flagship ? REPORT.sections : []).map((s) => (
            <div key={s.title}>
              <div className="text-sm font-semibold">{s.title}</div>
              <p className="text-sm text-[var(--ink-soft)]">
                {s.body}
                {s.cites.map((c) => (
                  <Cite key={c} id={c} />
                ))}
              </p>
            </div>
          ))}
        </div>
      </Panel>
      <div className="space-y-5">
        <SignOff r={r} />
        <Panel className="p-5">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4 text-[var(--ok)]" /> Acceptance checks
          </div>
          <ul className="space-y-1.5 text-sm">
            {rep.checks.map((a) => (
              <li key={a.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <CircleCheck className="h-4 w-4 text-[var(--ok)]" /> {a.name}
                </span>
                <span className="text-xs text-[var(--ink-faint)]">{a.result}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function EvidenceTab({ r }: { r: WorkRequest }) {
  if (r.capabilityId !== SRA_ID) return <GenericEvidence r={r} />;
  const total = EVIDENCE_ROWS.reduce((s, e) => s + e.cost, 0);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel className="p-5">
        <div className="mb-3 font-semibold">Findings by agent</div>
        <div className="space-y-3">
          {SRP_AGENTS.filter((a) => a.id !== 'drafter').map((a) => (
            <div key={a.id}>
              <div className="text-sm font-semibold">
                {a.name} <span className="font-normal text-[var(--ink-soft)]">· {AGENT_FINDINGS[a.id].short}</span>
              </div>
              <ul className="mt-0.5 space-y-0.5 text-xs text-[var(--ink-soft)]">
                {AGENT_FINDINGS[a.id].bullets.map((b) => (
                  <li key={b}>• {withCites(b)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer font-medium text-[var(--ink-soft)]">Sources ({CITATIONS.length})</summary>
          <ul className="mt-1.5 space-y-0.5 text-[var(--ink-soft)]">
            {CITATIONS.map((c) => (
              <li key={c.id}>
                <span className="font-mono font-semibold text-[var(--info)]">{c.id}</span> {c.source}
              </li>
            ))}
          </ul>
        </details>
      </Panel>
      <div className="space-y-5">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
            <span className="font-semibold">Cost by agent</span>
            <span className="font-mono font-semibold text-[var(--brand-strong)]">{money(total)}</span>
          </div>
          <table className="w-full text-left text-xs">
            <tbody>
              {EVIDENCE_ROWS.map((e) => (
                <tr key={e.trace} className="border-t border-[var(--line)] first:border-0">
                  <td className="px-4 py-2 font-medium">{agentLabel(e.agent)}</td>
                  <td className="px-2 py-2 font-mono text-[var(--info)]">{e.trace}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-[var(--ink-faint)]">{e.tokens.toLocaleString()} tok</td>
                  <td className="px-4 py-2 text-right tabular-nums">{money(e.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel className="p-4">
          <div className="mb-2 font-semibold">Governance events</div>
          <ul className="space-y-1.5 text-sm">
            <li className="flex gap-2">
              <Ban className="mt-0.5 h-4 w-4 shrink-0 text-[var(--deny)]" /> Denied read on patient_summary · logged · rerouted
            </li>
            <li className="flex gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn)]" /> 1 model timeout · retried
            </li>
            <li className="flex gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ok)]" /> Certified skills only · under $1.00 cap
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function GenericEvidence({ r }: { r: WorkRequest }) {
  const byAgent = r.agentIds.map((id) => {
    const logs = r.logs.filter((l) => l.agent === id);
    return { id, name: roleAgentById(id)?.name ?? id, events: logs.length, denied: logs.some((l) => l.kind === 'deny'), retried: logs.some((l) => l.kind === 'warn') };
  });
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
        <span className="font-semibold">Agents in this run</span>
        <span className="font-mono font-semibold text-[var(--brand-strong)]">{money(r.cost)}</span>
      </div>
      <table className="w-full text-left text-sm">
        <tbody>
          {byAgent.map((a) => (
            <tr key={a.id} className="border-t border-[var(--line)] first:border-0">
              <td className="px-4 py-2 font-medium">{a.name}</td>
              <td className="px-2 py-2 text-xs text-[var(--ink-faint)]">{a.events} traced events</td>
              <td className="px-4 py-2 text-right">
                {a.denied && <Chip tone="deny">denied · rerouted</Chip>} {a.retried && <Chip tone="warn">retried</Chip>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

const TABS = ['Report', 'Agent cards', 'Evidence', 'Replay'] as const;

// Who acted, for whom, and what each agent could reach for this outcome.
function AgentCards({ r }: { r: WorkRequest }) {
  const person = personFor(r.requester, capabilityById(r.capabilityId)?.domainId ?? 'rd-reg');
  const agents = r.agentIds.map((id) => roleAgentById(id)).filter((a) => a !== undefined);
  return (
    <div className="space-y-4">
      <RunAccessSummary agents={agents} person={person} />
      <div className="grid gap-4 xl:grid-cols-2">
        {agents.map((a) => (
          <AgentCard key={a.id} agent={a} person={person} run={{ id: r.id, title: r.title.split(' · ')[0] }} />
        ))}
      </div>
    </div>
  );
}

function Archived({ r }: { r: WorkRequest }) {
  const pod = podById(r.podId);
  return (
    <Panel className="p-6">
      <div className="text-sm text-[var(--ink-soft)]">{r.requestText}</div>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
        <Stat label="Pod" value={<span className="text-sm">{pod?.name}</span>} />
        <Stat label="Tokens" value={r.tokens.toLocaleString()} />
        <Stat label="Cost" value={money(r.cost)} />
      </div>
      {r.decision && (
        <div className="mt-4 text-sm text-[var(--ink-soft)]">
          Signed off by {r.decision.by}, {r.decision.at}.
        </div>
      )}
    </Panel>
  );
}

export function RequestPage() {
  const { requestId } = useParams();
  const { state } = useStore();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Report');
  const r = state.requests.find((x) => x.id === requestId);

  if (!r)
    return (
      <Panel className="p-10 text-center text-sm text-[var(--ink-soft)]">
        This request no longer exists (the demo may have been reset).{' '}
        <Link to="/work" className="font-medium text-[var(--brand-strong)]">
          Back to Work
        </Link>
      </Panel>
    );

  const label = statusLabel(r);
  const cancelled = r.status === 'rejected' && r.logs.length === 0 && !r.archived;
  const hasReport = ['pending_approval', 'completed', 'changes_requested'].includes(r.status) || (r.status === 'rejected' && r.decision);

  return (
    <div>
      <Link to="/work" className="mb-3 inline-block text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]">
        ← Work
      </Link>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{r.title}</h1>
        <Chip tone={label.tone}>{label.text}</Chip>
        <span className="font-mono text-xs text-[var(--ink-faint)]">
          {r.id} · {money(r.cost)}
        </span>
      </div>

      {r.archived ? (
        <div className="space-y-5">
          <Archived r={r} />
          <AgentCards r={r} />
        </div>
      ) : cancelled ? (
        <Panel className="p-10 text-center text-sm text-[var(--ink-soft)]">Cancelled before the pod ran. Nothing ran.</Panel>
      ) : !hasReport ? (
        r.status === 'in_progress' ? (
          <RunCard r={r} />
        ) : r.status === 'pod_review' ? (
          <div className="space-y-2">
            <p className="text-sm text-[var(--ink-soft)]">A pod has been drafted for this run. Nothing runs until you approve it.</p>
            <PodCard r={r} />
          </div>
        ) : (
          <Panel className="flex items-center justify-center gap-2 p-10 text-sm text-[var(--ink-soft)]">
            <LoaderCircle className="h-4 w-4 animate-spin text-[var(--brand)]" /> Drafting the pod…
          </Panel>
        )
      ) : (
        <>
          <div className="mb-4 flex w-fit gap-1 rounded-xl bg-[#f3efeb] p-1">
            {TABS.map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={cx('rounded-lg px-3 py-1.5 text-sm font-medium', tab === t ? 'bg-white shadow-sm' : 'text-[var(--ink-soft)]')}>
                {t}
              </button>
            ))}
          </div>
          {tab === 'Report' && <ReportTab r={r} />}
          {tab === 'Agent cards' && <AgentCards r={r} />}
          {tab === 'Evidence' && <EvidenceTab r={r} />}
          {tab === 'Replay' && (
            <div className="space-y-4">
              <RunCard r={r} />
              <Panel className="overflow-hidden">
                <div className="px-3 py-2 text-sm font-semibold">Full activity log</div>
                <ActivityList logs={r.logs} />
              </Panel>
            </div>
          )}
        </>
      )}
    </div>
  );
}

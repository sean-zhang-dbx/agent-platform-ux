import { useState } from 'react';
import { Check, CircleAlert, FileSignature, LoaderCircle, Lock, PenLine, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { STATE_ORDER, type Decision, type EventRow, type Reviewer, type RunStatus, type WsState } from '../../../shared/feasibility';
import { Chip } from '../components/ui';
import { cx } from '../lib/format';

export const STATE_LABEL: Record<WsState, string> = { pending: 'Pending', in_progress: 'In progress', awaiting_approval: 'Awaiting approval', approved: 'Approved', rejected: 'Rejected', complete: 'Complete' };
const STATE_TONE: Record<WsState, 'neutral' | 'brand' | 'warn' | 'ok' | 'deny'> = { pending: 'neutral', in_progress: 'brand', awaiting_approval: 'warn', approved: 'ok', rejected: 'deny', complete: 'ok' };

export function StateChip({ state }: { state: WsState }) {
  return (
    <Chip tone={STATE_TONE[state]}>
      {state === 'in_progress' && <LoaderCircle className="h-3 w-3 animate-spin" />}
      {state === 'awaiting_approval' && <PenLine className="h-3 w-3" />}
      {state === 'complete' && <Check className="h-3 w-3" />}
      {state === 'rejected' && <X className="h-3 w-3" />}
      {STATE_LABEL[state]}
    </Chip>
  );
}

export const RUN_LABEL: Record<RunStatus, { text: string; tone: 'neutral' | 'brand' | 'warn' | 'ok' | 'deny' }> = {
  running: { text: 'Agents working', tone: 'brand' },
  awaiting_gates: { text: 'Waiting on sign-off', tone: 'warn' },
  blocked: { text: 'Blocked by a rejection', tone: 'deny' },
  awaiting_release: { text: 'Ready for release', tone: 'warn' },
  released: { text: 'Released · locked', tone: 'ok' },
};

// pending → in_progress → awaiting_approval → approved → complete (ungated skips the gate steps).
export function Stepper({ state, gated }: { state: WsState; gated: boolean }) {
  const steps = gated ? STATE_ORDER : STATE_ORDER.filter((s) => s !== 'awaiting_approval' && s !== 'approved');
  const at = state === 'rejected' ? steps.indexOf('awaiting_approval') : steps.indexOf(state);
  return (
    <div className="flex items-center gap-1" aria-label={`State: ${STATE_LABEL[state]}`}>
      {steps.map((s, i) => {
        const done = i < at || (s === 'complete' && state === 'complete');
        const now = i === at && state !== 'complete';
        return (
          <div key={s} className="flex min-w-0 flex-1 flex-col gap-1" title={STATE_LABEL[s]}>
            <div className={cx('h-1.5 rounded-full', done ? 'bg-[var(--ok)]' : now ? (state === 'rejected' ? 'bg-[var(--deny)]' : state === 'awaiting_approval' ? 'bg-[var(--warn)]' : 'bg-[var(--brand)]') : 'bg-[#ebe4de]')} />
            <span className={cx('truncate text-[10px]', now ? 'font-semibold text-[var(--ink)]' : 'text-[var(--ink-faint)]')}>{s === 'awaiting_approval' ? 'Gate' : STATE_LABEL[s]}</span>
          </div>
        );
      })}
    </div>
  );
}

const KIND_DOT: Record<EventRow['kind'], string> = { info: 'bg-[#bdb3aa]', api: 'bg-[#4a3aa7]', gate: 'bg-[var(--warn)]', ok: 'bg-[var(--ok)]', warn: 'bg-[var(--warn)]', deny: 'bg-[var(--deny)]' };

export function EventList({ events, max }: { events: EventRow[]; max?: number }) {
  const rows = max ? events.slice(-max) : events;
  return (
    <ol className="space-y-1.5">
      {rows.map((e) => (
        <li key={e.id} className="flex gap-2 text-xs">
          <span className="w-16 shrink-0 font-mono text-[var(--ink-faint)]">{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          <span className={cx('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', KIND_DOT[e.kind])} />
          <span className={cx('min-w-0', e.kind === 'api' && 'font-mono text-[11px] text-[#4a3aa7]', e.kind === 'deny' && 'text-[var(--deny)]')}>{e.text}</span>
        </li>
      ))}
    </ol>
  );
}

// Part 11-style signature: typed printed name + meaning + date/time, linked to the exact artifact hash.
export function SignForm({
  reviewer,
  artifactRef,
  artifactHash,
  mode,
  onSubmit,
}: {
  reviewer: Reviewer;
  artifactRef: string;
  artifactHash: string;
  mode: 'gate' | 'release';
  onSubmit: (d: { decision: Decision | 'release'; signature: string; comment: string; confirm: boolean }) => Promise<void>;
}) {
  const [decision, setDecision] = useState<Decision | 'release'>(mode === 'release' ? 'release' : 'approve');
  const [signature, setSignature] = useState('');
  const [comment, setComment] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsComment = decision === 'reject' || decision === 'request_changes';
  const nameOk = signature.trim().toLowerCase() === reviewer.name.toLowerCase();
  const ready = nameOk && confirm && (!needsComment || comment.trim().length >= 5) && !busy;
  const meaning = { approve: 'Approved', reject: 'Rejected', request_changes: 'Changes requested', release: 'Released' }[decision];

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ decision, signature, comment, confirm });
      setSignature('');
      setComment('');
      setConfirm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-[var(--brand)] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-[var(--brand)]" />
          <div>
            <div className="font-semibold">{mode === 'release' ? 'Final release sign-off' : 'Review and e-sign'}</div>
            <div className="text-xs text-[var(--ink-soft)]">
              Assigned to <b className="text-[var(--ink)]">{reviewer.name}</b> · {reviewer.role}
            </div>
          </div>
        </div>
        <div className="text-right font-mono text-[11px] text-[var(--ink-faint)]">
          <div>{artifactRef}</div>
          <div>sha256 {artifactHash.slice(0, 16)}…</div>
        </div>
      </div>

      {mode === 'gate' && (
        <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg bg-[#f3efeb] p-1">
          {(
            [
              ['approve', 'Approve', Check],
              ['request_changes', 'Request changes', RotateCcw],
              ['reject', 'Reject', X],
            ] as const
          ).map(([d, label, Icon]) => (
            <button key={d} type="button" onClick={() => setDecision(d)} className={cx('flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium', decision === d ? (d === 'reject' ? 'bg-[var(--deny)] text-white' : d === 'request_changes' ? 'bg-[var(--warn)] text-white' : 'bg-[var(--ok)] text-white') : 'text-[var(--ink-soft)]')}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      )}

      <label className="mb-2 block text-xs font-medium text-[var(--ink-soft)]">
        {needsComment ? 'Rationale (required)' : 'Rationale or comment'}
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder={decision === 'request_changes' ? 'What should the agent change? It redoes the step with this.' : decision === 'reject' ? 'Why is this rejected?' : 'Optional note for the record'} className="mt-1 block w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand)]" />
      </label>

      <label className="mb-2 block text-xs font-medium text-[var(--ink-soft)]">
        Type your full name to sign
        <input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder={reviewer.name} className={cx('mt-1 block w-full rounded-lg border px-3 py-2 font-serif text-base italic text-[var(--ink)] outline-none', signature && !nameOk ? 'border-[var(--deny)]' : 'border-[var(--line)] focus:border-[var(--brand)]')} />
      </label>

      <label className="mb-3 flex items-start gap-2 text-xs text-[var(--ink-soft)]">
        <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5" />
        <span>
          I, {reviewer.name}, confirm this typed name is my electronic signature, with the meaning <b>“{meaning}”</b>, applied to the artifact above. (Simulated e-signature for the prototype.)
        </span>
      </label>

      {error && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-[var(--deny-soft)] px-3 py-2 text-xs text-[var(--deny)]">
          <CircleAlert className="h-3.5 w-3.5" /> {error}
        </div>
      )}

      <button type="button" disabled={!ready} onClick={() => void submit()} className={cx('flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white', ready ? 'bg-[var(--brand)] hover:bg-[var(--brand-strong)]' : 'cursor-not-allowed bg-[#d9cfc7]')}>
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : mode === 'release' ? <Lock className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
        Sign: {meaning}
      </button>
    </div>
  );
}

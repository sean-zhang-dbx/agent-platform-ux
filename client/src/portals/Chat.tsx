import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowUp, Boxes, CircleCheck, LoaderCircle, Plus, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { useStore } from '../state/store';
import { SRA_ID } from '../data/capabilities';
import { CAPABILITIES, capabilityById, podById } from '../data/estate';
import { composerSteps } from '../data/genericRun';
import { PodCard } from './chat/PodCard';
import { RunCard } from './chat/RunCard';
import { ReportCard } from './chat/ReportCard';
import { cx } from '../lib/format';

function Bot({ icon, name, children }: { icon: ReactNode; name: string; children: ReactNode }) {
  return (
    <div className="fade-up flex gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--ink)] text-white">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-xs font-semibold text-[var(--ink-soft)]">{name}</div>
        {children}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="fade-up flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--brand-soft)] px-4 py-3 text-[15px] leading-relaxed">{text}</div>
    </div>
  );
}

const SUGGESTED = [SRA_ID, 'triage-deviation', 'forecast-demand-shortfall', 'answer-med-info-request'];

export function ChatPortal() {
  const { active, submitRequest, presenter, newChat } = useStore();
  const [params, setParams] = useSearchParams();
  const preset = capabilityById(params.get('cap') ?? '');
  const [text, setText] = useState(preset?.sampleRequest ?? '');
  const [presetId, setPresetId] = useState(preset?.id);
  const [extra, setExtra] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const status = active?.status;
  const busy = status === 'composing' || status === 'pod_review' || status === 'in_progress' || status === 'pending_approval';
  const cancelled = status === 'rejected' && active?.logs.length === 0;
  const showRun = active && active.logs.length > 0;
  const showReport = Boolean(active && (['pending_approval', 'completed', 'changes_requested'].includes(active.status) || (active.status === 'rejected' && active.decision)));
  const cap = active ? capabilityById(active.capabilityId) : undefined;
  const steps = cap ? composerSteps(cap) : [];
  const pod = active ? podById(active.podId) : undefined;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [status, active?.composerStep, active?.logs.length, active?.decision, extra.length]);

  const start = (q: string, capId?: string) => {
    submitRequest(q, capId);
    setText('');
    setPresetId(undefined);
    if (params.get('cap')) setParams({});
  };

  const send = (e?: FormEvent) => {
    e?.preventDefault();
    const q = text.trim();
    if (!q) return;
    if (!active) start(q, presetId);
    else {
      setExtra((x) => [...x, q]);
      setText('');
    }
  };

  const inputShift = presenter.on ? 'xl:ml-0' : '';

  if (!active)
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--brand)] text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">What do you need done?</h1>
          <p className="mt-2 text-[var(--ink-soft)]">Describe the outcome. A pod is drafted from certified capabilities, and you approve before anything runs.</p>
        </div>
        <form onSubmit={send} className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-3 shadow-sm focus-within:border-[var(--brand)]">
          {preset && presetId && (
            <div className="mb-2 flex items-center gap-2 px-1 text-xs text-[var(--ink-soft)]">
              Using capability <b className="text-[var(--ink)]">{preset.name}</b>
              <button type="button" className="text-[var(--brand-strong)] hover:underline" onClick={() => setPresetId(undefined)}>
                change
              </button>
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) send(e);
            }}
            rows={3}
            placeholder="Ask for an outcome, e.g. triage deviation DEV-2311 at Northgate"
            className="w-full resize-none bg-transparent px-1 text-[15px] outline-none placeholder:text-[var(--ink-faint)]"
          />
          <div className="flex justify-end">
            <button type="submit" disabled={!text.trim()} aria-label="Send" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--brand)] text-white disabled:opacity-40">
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </form>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {SUGGESTED.map((id) => {
            const c = capabilityById(id);
            if (!c) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => start(c.sampleRequest, c.id)}
                className={cx('rounded-xl border border-dashed bg-white/60 p-3 text-left text-sm transition hover:bg-white', id === SRA_ID ? 'border-[var(--brand)]' : 'border-[var(--brand-line)]')}
              >
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-[var(--ink-faint)]">{c.domain}</div>
              </button>
            );
          })}
        </div>
        <Link to="/capabilities" className="mt-3 text-center text-sm text-[var(--brand-strong)] hover:underline">
          Browse all {CAPABILITIES.length} capabilities →
        </Link>
      </div>
    );

  const composing = status === 'composing';

  return (
    <div className={cx('mx-auto max-w-3xl pb-28', presenter.on && 'xl:ml-0')}>
      <div className="space-y-6">
        <UserBubble text={active.requestText} />

        <Bot icon={<Wand2 className="h-4 w-4" />} name="Composer agent">
          {composing ? (
            <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
              <ol className="space-y-2">
                {steps.slice(0, active.composerStep + 1).map((s, i) => (
                  <li key={s.text} className="fade-up flex items-center gap-2 text-sm">
                    {i < active.composerStep ? <CircleCheck className="h-4 w-4 text-[var(--ok)]" /> : <LoaderCircle className="h-4 w-4 animate-spin text-[var(--brand)]" />}
                    <span className={cx(i === active.composerStep && 'text-[var(--ink-soft)]')}>{s.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[15px]">
                Using capability <b>{cap?.name}</b>. Here is the pod, ready for your review.
              </p>
              <details className="text-sm">
                <summary className="cursor-pointer text-xs font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]">Why this pod</summary>
                <ol className="mt-2 space-y-1 rounded-xl bg-white/70 p-3">
                  {steps.map((s) => (
                    <li key={s.text}>
                      <span className="font-medium">{s.text}</span>
                      {s.detail && <span className="text-[var(--ink-soft)]"> · {s.detail}</span>}
                    </li>
                  ))}
                </ol>
              </details>
              <PodCard r={active} />
            </div>
          )}
        </Bot>

        {cancelled && (
          <Bot icon={<Wand2 className="h-4 w-4" />} name="Composer agent">
            <p className="text-sm text-[var(--ink-soft)]">Cancelled. Nothing ran.</p>
          </Bot>
        )}

        {showRun && (
          <Bot icon={<Boxes className="h-4 w-4" />} name={pod?.name ?? 'Pod'}>
            <RunCard r={active} />
          </Bot>
        )}

        {showReport && (
          <Bot icon={<Boxes className="h-4 w-4" />} name="Drafter">
            <ReportCard r={active} />
          </Bot>
        )}

        {active.decision && (
          <Bot icon={<ShieldCheck className="h-4 w-4" />} name="Work plane">
            <div className={cx('rounded-2xl px-4 py-3 text-sm', active.decision.decision === 'approved' ? 'bg-[var(--ok-soft)]' : active.decision.decision === 'rejected' ? 'bg-[var(--deny-soft)]' : 'bg-[var(--warn-soft)]')}>
              <div className="font-semibold">
                {active.decision.decision === 'approved'
                  ? 'Signed by you. The agent drafted it. You decided.'
                  : active.decision.decision === 'rejected'
                    ? 'Rejected by you.'
                    : 'Changes requested. Saved as feedback for the next pod version.'}
              </div>
              <div className="text-xs text-[var(--ink-soft)]">{active.decision.at} · recorded with the evidence trail</div>
            </div>
          </Bot>
        )}

        {extra.map((q, i) => (
          <div key={`${q}-${i.toString()}`} className="space-y-6">
            <UserBubble text={q} />
            <Bot icon={<Wand2 className="h-4 w-4" />} name="Composer agent">
              <p className="text-sm text-[var(--ink-soft)]">Start a new request to run another capability.</p>
            </Bot>
          </div>
        ))}
        {!busy && (
          <div className="flex justify-center">
            <button type="button" onClick={newChat} className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-4 py-1.5 text-sm font-medium hover:border-[var(--brand-line)]">
              <Plus className="h-4 w-4" /> New request
            </button>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-[var(--canvas)]/95 px-4 py-3 backdrop-blur md:left-[232px]">
        <div className={cx('mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-3 py-2 focus-within:border-[var(--brand)]', inputShift)}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            placeholder={busy ? 'The pod is working. Review or approve above.' : 'Ask a follow-up'}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--ink-faint)] disabled:cursor-not-allowed"
          />
          <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="grid h-8 w-8 place-items-center rounded-full bg-[var(--brand)] text-white disabled:opacity-40">
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Radio, X } from 'lucide-react';
import { IT_LIVE_SEED, IT_STREAM, type OpTicket } from '../data/itservice';
import { Chip, PrimaryButton } from './ui';
import { cx } from '../lib/format';

// The live-run experience for a continuous operational pod. Instead of a one-shot report, it streams
// tickets in real time and accumulates counters (handled · auto-resolved · assisted · escalated · queue).

const OUTCOME_TONE = { 'Auto-resolved': 'ok', Assisted: 'warn', Escalated: 'deny' } as const;

interface Live extends OpTicket {
  at: number;
}

function LiveModal({ onClose }: { onClose: () => void }) {
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [counts, setCounts] = useState({ ...IT_LIVE_SEED });
  const [feed, setFeed] = useState<Live[]>(() => IT_STREAM.slice(0, 5).map((t, i) => ({ ...t, id: `INC00${(48213 - i).toString()}`, at: Date.now() - (i + 1) * 9000 })));
  const seq = useRef(48214);
  const idx = useRef(0);

  // Stream a new ticket every ~1.4s while running.
  useEffect(() => {
    if (paused) return;
    const tick = window.setInterval(() => {
      const base = IT_STREAM[idx.current % IT_STREAM.length];
      idx.current += 1;
      const jitter = Math.round((Math.random() - 0.5) * 6) / 100;
      const t: Live = { ...base, id: `INC00${(seq.current++).toString()}`, confidence: Math.min(0.99, Math.max(0.35, base.confidence + jitter)), at: Date.now() };
      setFeed((f) => [t, ...f].slice(0, 14));
      setCounts((c) => ({
        handled: c.handled + 1,
        autoResolved: c.autoResolved + (t.outcome === 'Auto-resolved' ? 1 : 0),
        assisted: c.assisted + (t.outcome === 'Assisted' ? 1 : 0),
        escalated: c.escalated + (t.outcome === 'Escalated' ? 1 : 0),
        inQueue: Math.max(3, Math.min(16, c.inQueue + (Math.random() < 0.5 ? 1 : -1))),
        mttrMin: c.mttrMin,
      }));
    }, 1400);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(clock);
    };
  }, [paused]);

  const deflection = Math.round((counts.autoResolved / counts.handled) * 100);
  const escRate = Math.round((counts.escalated / counts.handled) * 100);
  const ago = (t: number) => {
    const s = Math.max(0, Math.floor((now - t) / 1000));
    return s < 3 ? 'just now' : s < 60 ? `${s.toString()}s ago` : `${Math.floor(s / 60).toString()}m ago`;
  };

  const tiles: { label: string; value: string; sub?: string; tone?: 'ok' | 'warn' | 'deny' }[] = [
    { label: 'Handled today', value: counts.handled.toLocaleString() },
    { label: 'Auto-resolved', value: counts.autoResolved.toLocaleString(), sub: `${deflection.toString()}% deflection`, tone: 'ok' },
    { label: 'Assisted', value: counts.assisted.toLocaleString(), sub: 'one-click for Tier 1', tone: 'warn' },
    { label: 'Escalated', value: counts.escalated.toLocaleString(), sub: `${escRate.toString()}% to a person`, tone: 'deny' },
    { label: 'In queue', value: counts.inQueue.toString(), sub: 'being triaged' },
    { label: 'Median MTTR', value: `${counts.mttrMin.toString()} min`, sub: 'was 4h 20m' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white bg-[#1f1d1b]">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Radio className="h-4 w-4" /> IT Service Desk Pod · Live operations
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[11px]">
            <span className={cx('h-1.5 w-1.5 rounded-full bg-[#4ade80]', !paused && 'animate-pulse')} />
            {paused ? 'Paused' : 'Running continuously'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPaused((p) => !p)} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20">
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} {paused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[var(--canvas)] p-5" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="mx-auto max-w-5xl space-y-4">
          <p className="text-sm text-[var(--ink-soft)]">
            Triggered by ServiceNow events — the pod runs continuously. Each ticket is triaged with a confidence score,
            then auto-resolved, prepared for a Tier-1 human, or escalated.
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {tiles.map((t) => (
              <div
                key={t.label}
                className="rounded-xl border bg-white px-3 py-2.5"
                style={{ borderColor: t.tone ? `var(--${t.tone})` : 'var(--line)', borderLeftWidth: t.tone ? 3 : 1 }}
              >
                <div className="text-xs text-[var(--ink-faint)]">{t.label}</div>
                <div className="mt-0.5 text-2xl font-semibold tabular-nums">{t.value}</div>
                {t.sub && <div className="text-[11px] text-[var(--ink-soft)]">{t.sub}</div>}
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 border-b border-[var(--line)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
              <span>Ticket</span>
              <span>Summary</span>
              <span className="text-right">Confidence</span>
              <span className="text-right">Outcome</span>
              <span className="text-right">When</span>
            </div>
            <div className="divide-y divide-[var(--line)]">
              {feed.map((t, i) => (
                <div key={t.id} className={cx('grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-3 py-2 text-sm', i === 0 && 'fade-up')}>
                  <span className="font-mono text-xs text-[var(--ink-faint)]">{t.id}</span>
                  <span className="min-w-0">
                    <span className="block truncate">{t.summary}</span>
                    <span className="block truncate text-[11px] text-[var(--ink-faint)]">
                      {t.category} · {t.note}
                    </span>
                  </span>
                  <span className="text-right font-mono text-xs tabular-nums text-[var(--ink-soft)]">{t.confidence.toFixed(2)}</span>
                  <span className="text-right">
                    <Chip tone={OUTCOME_TONE[t.outcome]}>{t.outcome}</Chip>
                  </span>
                  <span className="text-right text-[11px] tabular-nums text-[var(--ink-faint)]">{ago(t.at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LiveOpsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PrimaryButton onClick={() => setOpen(true)}>
        <Radio className="h-4 w-4" /> Run live
      </PrimaryButton>
      {open && <LiveModal onClose={() => setOpen(false)} />}
    </>
  );
}

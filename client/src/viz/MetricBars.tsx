import { CircleCheck } from 'lucide-react';
import { METRICS } from '../data/podVersions';

// Paired bars per metric. Metrics have different units, so each row has its own scale
// (never a shared axis across rows). The tick marks the held-out result for v1.4.

const LIVE = '#b9b0a8';
const CANDIDATE = '#eb6834';

export function MetricBars() {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ink-soft)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm" style={{ background: LIVE }} /> v1.3 live
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm" style={{ background: CANDIDATE }} /> v1.4 candidate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-[var(--ink)]" /> v1.4 on held-out set
        </span>
      </div>
      <div className="space-y-3">
        {METRICS.map((m) => {
          const max = Math.max(m.liveN, m.candidateN, m.heldOutN) * 1.12;
          const w = (v: number) => `${((v / max) * 100).toString()}%`;
          return (
            <div key={m.name} className="grid grid-cols-[8.5rem_1fr_4.5rem_4.5rem] items-center gap-3">
              <div>
                <div className="text-sm font-medium">{m.name}</div>
                <div className="text-[11px] text-[var(--ink-faint)]">{m.higherIsBetter ? 'higher is better' : 'lower is better'}</div>
              </div>
              <div className="relative space-y-1" title={`v1.3 ${m.live} · v1.4 ${m.candidate} · held-out ${m.heldOut}`}>
                <div className="h-3 rounded-r-[4px]" style={{ width: w(m.liveN), background: LIVE }} />
                <div className="h-3 rounded-r-[4px]" style={{ width: w(m.candidateN), background: CANDIDATE }} />
                <span className="absolute bottom-[-2px] h-[18px] w-0.5 bg-[var(--ink)]" style={{ left: w(m.heldOutN) }} />
              </div>
              <div className="text-right text-xs leading-[1.35] tabular-nums">
                <div className="text-[var(--ink-soft)]">{m.live}</div>
                <div className="font-semibold">{m.candidate}</div>
              </div>
              <span className="flex items-center justify-end gap-1 text-xs font-semibold text-[var(--ok)]">
                <CircleCheck className="h-3.5 w-3.5" /> {m.delta}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-[var(--ink-faint)]">40 representative requests · 15 held-out cases owned by QA</div>
    </div>
  );
}

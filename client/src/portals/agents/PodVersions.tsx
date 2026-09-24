import { useState } from 'react';
import { ArrowRight, CircleCheck, MessageSquareWarning, RotateCcw, Upload } from 'lucide-react';
import { useStore } from '../../state/store';
import { CANDIDATE_CHANGES, GUARD, LIFECYCLE } from '../../data/podVersions';
import { MetricBars } from '../../viz/MetricBars';
import { Chip, Panel, PrimaryButton, SecondaryButton } from '../../components/ui';
import { cx } from '../../lib/format';

export function PodVersions() {
  const { state, promote, rollback } = useStore();
  const [confirming, setConfirming] = useState(false);
  const promoted = state.liveVersion === 'v1.4';
  const stage = promoted ? LIFECYCLE.length - 1 : 2; // candidate is at "Evaluate"

  return (
    <Panel id="versions" className="mb-5 scroll-mt-24 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">Versions</h2>
          <div className="text-sm text-[var(--ink-soft)]">Live stays stable. Candidates are tested first.</div>
        </div>
        <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          {LIFECYCLE.map((s, i) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className={cx('rounded-full px-2.5 py-1', i < stage && 'bg-[var(--ok-soft)] text-[var(--ok)]', i === stage && 'bg-[var(--brand)] text-white', i > stage && 'bg-[#f3efeb] text-[var(--ink-faint)]')}>{s}</span>
              {i < LIFECYCLE.length - 1 && <ArrowRight className="h-3 w-3 text-[var(--ink-faint)]" />}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className={cx('flex-1 rounded-xl border p-3', !promoted ? 'border-2 border-[var(--ok)]' : 'border-[var(--line)]')}>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">v1.3</span>
                {!promoted ? <Chip tone="ok">Live</Chip> : <Chip>Rollback ready</Chip>}
              </div>
              <div className="text-xs text-[var(--ink-faint)]">Approved 12 Sep</div>
            </div>
            <div className={cx('flex-1 rounded-xl border p-3', promoted ? 'border-2 border-[var(--ok)]' : 'border-2 border-dashed border-[var(--brand)]')}>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">v1.4</span>
                {promoted ? <Chip tone="ok">Live</Chip> : <Chip tone="brand">Candidate</Chip>}
              </div>
              <div className="text-xs text-[var(--ink-faint)]">From {state.feedback} corrections + 37 traces</div>
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-sm font-semibold">What changed</div>
            <ul className="space-y-1.5">
              {CANDIDATE_CHANGES.map((c) => (
                <li key={c.text} className="flex gap-2 text-sm">
                  <Chip tone={c.area === 'Skill' ? 'brand' : 'info'}>{c.area}</Chip>
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-[var(--ok-soft)] p-3">
            <div className="mb-1 text-sm font-semibold text-[var(--ok)]">Controls guard passed</div>
            <ul className="space-y-0.5 text-sm">
              {GUARD.map((g) => (
                <li key={g} className="flex items-center gap-1.5">
                  <CircleCheck className="h-4 w-4 text-[var(--ok)]" /> {g}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <MetricBars />

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            {promoted ? (
              <SecondaryButton onClick={rollback}>
                <RotateCcw className="h-4 w-4" /> Roll back to v1.3
              </SecondaryButton>
            ) : confirming ? (
              <>
                <span className="text-sm text-[var(--ink-soft)]">Pod owner approval required.</span>
                <SecondaryButton onClick={() => setConfirming(false)}>Cancel</SecondaryButton>
                <PrimaryButton
                  onClick={() => {
                    setConfirming(false);
                    promote();
                  }}
                >
                  Approve &amp; promote
                </PrimaryButton>
              </>
            ) : (
              <PrimaryButton onClick={() => setConfirming(true)}>
                <Upload className="h-4 w-4" /> Promote v1.4
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-[var(--line)] bg-[var(--canvas)] px-5 py-2.5 text-xs text-[var(--ink-soft)]">
        <MessageSquareWarning className="h-4 w-4 text-[var(--warn)]" />
        Every “Request changes” at sign-off is saved as a correction for the next version.
      </div>
    </Panel>
  );
}

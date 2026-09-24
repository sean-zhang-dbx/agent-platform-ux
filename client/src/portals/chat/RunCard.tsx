import { Ban, CircleCheck, Info, TriangleAlert, Wrench } from 'lucide-react';
import { roleAgentById } from '../../data/estate';
import type { LogKind, LogLine, WorkRequest } from '../../data/types';
import { Swimlanes } from '../../viz/Swimlanes';
import { cx, money } from '../../lib/format';

const LOG_ICON: Record<LogKind, { icon: typeof Info; cls: string }> = {
  info: { icon: Info, cls: 'text-[var(--ink-faint)]' },
  tool: { icon: Wrench, cls: 'text-[var(--info)]' },
  warn: { icon: TriangleAlert, cls: 'text-[var(--warn)]' },
  deny: { icon: Ban, cls: 'text-[var(--deny)]' },
  ok: { icon: CircleCheck, cls: 'text-[var(--ok)]' },
};

export function agentLabel(a: LogLine['agent']): string {
  return a === 'orchestrator' ? 'Orchestrator' : (roleAgentById(a)?.name ?? a);
}

export function ActivityList({ logs }: { logs: LogLine[] }) {
  return (
    <div className="max-h-[300px] overflow-y-auto">
      {[...logs].reverse().map((l) => {
        const { icon: Icon, cls } = LOG_ICON[l.kind];
        return (
          <div key={l.id} className={cx('flex gap-3 border-t border-[var(--line)] px-3 py-1.5 text-xs', l.kind === 'deny' && 'bg-[var(--deny-soft)]/60')}>
            <span className="w-[62px] shrink-0 font-mono text-[var(--ink-faint)]">{l.at}</span>
            <Icon className={cx('mt-0.5 h-3.5 w-3.5 shrink-0', cls)} />
            <span>
              <span className="font-medium">{agentLabel(l.agent)}</span>
              <span className="text-[var(--ink-soft)]"> · {l.text}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function RunCard({ r }: { r: WorkRequest }) {
  const running = r.status === 'in_progress';
  const done = r.agentIds.filter((id) => r.agentStatus[id] === 'complete').length;
  const orchestrator = [...r.logs].reverse().find((l) => l.agent === 'orchestrator');

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
        <div>
          <div className="font-semibold">{running ? 'Pod working' : 'Pod finished'}</div>
          <div className="text-sm text-[var(--ink-soft)]">{orchestrator?.short ?? orchestrator?.text ?? 'Starting…'}</div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-[11px] text-[var(--ink-faint)]">Agents done</div>
            <div className="text-sm font-semibold tabular-nums">
              {done} / {r.agentIds.length}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[var(--ink-faint)]">Cost</div>
            <div className="font-mono text-sm font-semibold tabular-nums text-[var(--brand-strong)]">{money(r.cost)}</div>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <Swimlanes r={r} />
      </div>

      <details className="border-t border-[var(--line)]">
        <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]">Activity ({r.logs.length})</summary>
        <ActivityList logs={r.logs} />
      </details>
    </div>
  );
}

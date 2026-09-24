import { Ban, RotateCw } from 'lucide-react';
import { AGENT_FINDINGS } from '../data/report';
import { roleAgentById } from '../data/estate';
import type { WorkRequest } from '../data/types';
import { AgentStatusChip } from '../components/ui';

// One lane per Northwind-built agent on a shared time axis. The scripted run is compressed; the axis shows
// the real-world run time it stands for (~3m 40s).
const REAL_SECONDS = 220; // axis label only: the compressed run stands for ~3m 40s
const TICKS = [0, 60, 120, 180];
const LANE: Record<string, string> = { clinical: 'Clinical', regintel: 'Reg Intel', quality: 'Quality', drafter: 'Drafter' };
const FINDINGS = AGENT_FINDINGS as Record<string, { short: string } | undefined>;

function lane(id: string): string {
  if (LANE[id]) return LANE[id];
  const name = roleAgentById(id)?.name ?? id;
  return name.replace(/ Agent$/, '');
}

export function Swimlanes({ r }: { r: WorkRequest }) {
  const runMs = r.runMs || 20000;
  const pct = (ms: number) => Math.max(0, Math.min(100, (ms / runMs) * 100));
  const now = r.logs.reduce((m, l) => Math.max(m, l.ms ?? 0), 0);

  return (
    <div className="px-4 py-3">
      <div className="grid grid-cols-[11rem_1fr] gap-x-3">
        <div />
        <div className="relative mb-1 h-4 text-[10px] text-[var(--ink-faint)]">
          {TICKS.map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: `${((t / REAL_SECONDS) * 100).toString()}%` }}>
              {t === 0 ? '0:00' : `${Math.floor(t / 60).toString()}:00`}
            </span>
          ))}
        </div>

        {r.agentIds.map((agentId) => {
          const a = { id: agentId };
          const own = r.logs.filter((l) => l.agent === a.id);
          const start = own[0]?.ms;
          const done = own.find((l) => r.agentStatus[a.id] === 'complete' && l.kind === 'ok');
          const end = done?.ms ?? now;
          const deny = own.find((l) => l.kind === 'deny');
          const retry = own.find((l) => l.kind === 'warn');
          const status = r.agentStatus[a.id];
          const latest = [...own].reverse()[0];
          return (
            <div key={a.id} className="contents">
              <div className="flex min-w-0 flex-col items-start justify-center gap-1 border-t border-[var(--line)] py-2">
                <span className="w-full truncate text-sm font-medium" title={roleAgentById(a.id)?.name}>
                  {lane(a.id)}
                </span>
                <AgentStatusChip status={status} />
              </div>
              <div className="relative border-t border-[var(--line)] py-2.5">
                <div className="relative h-6">
                  {TICKS.map((t) => (
                    <span key={t} className="absolute inset-y-0 w-px bg-[#f0ebe6]" style={{ left: `${((t / REAL_SECONDS) * 100).toString()}%` }} />
                  ))}
                  {start !== undefined && (
                    <div
                      className={`absolute top-1 h-4 rounded-[4px] transition-all duration-500 ${status === 'complete' ? 'bg-[var(--ok)]' : 'bg-[var(--brand)]'} ${status === 'running' ? 'opacity-80' : ''}`}
                      style={{ left: `${pct(start).toString()}%`, width: `${Math.max(1.5, pct(end) - pct(start)).toString()}%` }}
                    />
                  )}
                  {deny?.ms !== undefined && (
                    <span className="absolute -top-0.5 flex -translate-x-1/2 items-center gap-0.5 rounded bg-[var(--deny)] px-1 py-0.5 text-[10px] font-semibold text-white" style={{ left: `${pct(deny.ms).toString()}%` }} title={deny.text}>
                      <Ban className="h-3 w-3" /> Denied
                    </span>
                  )}
                  {retry?.ms !== undefined && (
                    <span className="absolute -top-0.5 flex -translate-x-1/2 items-center gap-0.5 rounded bg-[var(--warn)] px-1 py-0.5 text-[10px] font-semibold text-white" style={{ left: `${pct(retry.ms).toString()}%` }} title={retry.text}>
                      <RotateCw className="h-3 w-3" /> Retry
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-xs text-[var(--ink-soft)]" title={latest?.text}>
                  {status === 'complete' ? (FINDINGS[a.id]?.short ?? latest?.short ?? 'Done') : (latest?.short ?? (a.id === r.agentIds[r.agentIds.length - 1] ? 'Waiting for the others' : 'Queued'))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

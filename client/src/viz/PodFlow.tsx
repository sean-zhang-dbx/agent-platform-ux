import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronRight, Database, GitBranch, Radio, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { useStore } from '../state/store';
import { roleAgentById, type PodDef, type RoleAgent } from '../data/estate';
import { SRP_ID, ITSP_ID, gateForAgent } from '../data/pods';
import { sponsorOf } from '../data/access';
import type { Skill } from '../data/types';
import { KIT_COLOR, shortName } from './palette';
import { cx } from '../lib/format';

// A pod is a team running a process — not one agent under an orchestrator. Work flows left to right
// through handoffs (curved connectors); each agent is itself composed of a skill, tools and sub-agents.

type ItemKind = 'source' | 'agent' | 'decision' | 'gate' | 'outcome';
interface FlowItem {
  kind: ItemKind;
  agentId?: string;
  title?: string;
  sub?: string;
  note?: string;
}
interface FlowPhase {
  title: string;
  edge?: string;
  parallel?: boolean;
  items: FlowItem[];
}

function authorPhases(pod: PodDef, agents: RoleAgent[]): FlowPhase[] {
  if (pod.id === SRP_ID) {
    return [
      { title: 'Context', items: [{ kind: 'source', title: 'Genie One (MCP)', sub: 'the context layer', note: 'Locked clinical data, prior CSRs and rules — permission-aware.' }] },
      { title: 'Draft & check', edge: 'brief', parallel: true, items: [{ kind: 'agent', agentId: 'clinical' }, { kind: 'agent', agentId: 'regintel' }, { kind: 'agent', agentId: 'quality' }] },
      { title: 'Assemble', edge: 'findings', items: [{ kind: 'agent', agentId: 'drafter' }] },
      { title: 'Sign-off', edge: 'draft', items: [{ kind: 'gate', title: 'Departmental sign-off', sub: 'Clinical · Reg Ops · RA release', note: 'Nothing is filed until the responsible people sign.' }] },
    ];
  }
  if (pod.id === ITSP_ID) {
    return [
      { title: 'Trigger', items: [{ kind: 'source', title: 'ServiceNow', sub: 'incident.created / alert', note: 'Event-driven — the pod runs continuously.' }] },
      { title: 'Triage', edge: 'ticket', items: [{ kind: 'agent', agentId: 'it-intake' }] },
      { title: 'Resolve', edge: 'classified', parallel: true, items: [{ kind: 'agent', agentId: 'it-knowledge' }, { kind: 'agent', agentId: 'it-automation' }] },
      { title: 'Decide', edge: 'candidate fix', items: [{ kind: 'decision', agentId: 'it-escalation' }] },
      { title: 'Outcome', edge: 'decision', items: [{ kind: 'outcome', title: 'Resolve in ServiceNow · or escalate', sub: '≥ 0.90 & reversible → auto · else a person' }] },
    ];
  }
  const workers = agents.slice(0, Math.max(1, agents.length - 1));
  const drafter = agents.length > 1 ? agents[agents.length - 1] : undefined;
  const phases: FlowPhase[] = [
    { title: 'Inputs', items: [{ kind: 'source', title: 'Genie One (MCP)', sub: 'context layer', note: 'The situation and governed sources for this request.' }] },
    { title: 'Work', edge: 'brief', parallel: workers.length > 1, items: workers.map((a) => ({ kind: 'agent' as const, agentId: a.id })) },
  ];
  if (drafter) phases.push({ title: 'Synthesise', edge: 'findings', items: [{ kind: 'agent', agentId: drafter.id }] });
  phases.push({ title: 'Review', edge: 'result', items: [{ kind: 'gate', title: 'Human sign-off', sub: 'a person decides' }] });
  return phases;
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--canvas)] px-1.5 py-0.5 text-[11px] text-[var(--ink-soft)]">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function AgentNode({ agentId, decision, phase, onPick }: { agentId: string; decision?: boolean; phase: number; onPick: (id: string) => void }) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const a = roleAgentById(agentId);
  if (!a) return null;
  const byId = (id: string): Skill | undefined => state.skills.find((s) => s.id === id);
  const skills = a.skills.map(byId).filter((s): s is Skill => s !== undefined);
  const tools = a.tools.map(byId).filter((s): s is Skill => s !== undefined);
  const subs = a.calls.map(byId).filter((s): s is Skill => s !== undefined);
  const gate = gateForAgent(a.podId, a.id);

  return (
    <div data-node data-phase={phase} className={cx('rounded-xl border bg-white p-2.5', decision ? 'border-2 border-[var(--brand)]' : 'border-[var(--line)]')}>
      <button type="button" onClick={() => onPick(a.id)} className="flex w-full items-start gap-1.5 text-left">
        {decision && <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand-strong)]" />}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-tight">{a.name}</span>
          <span className="block truncate text-[10px] text-[var(--ink-faint)]">
            {gate ? '⚑ ' : ''}
            acts for {sponsorOf(a)}
          </span>
        </span>
        <ChevronRight
          className={cx('mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ink-faint)] transition', open && 'rotate-90')}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
        />
      </button>

      {/* the tree within the agent */}
      <div className="mt-2 space-y-1">
        <div className="flex flex-wrap items-center gap-1">
          <span className="w-12 shrink-0 text-[10px] uppercase tracking-wide text-[var(--ink-faint)]">how</span>
          {skills.map((s) => (
            <Chip key={s.id} label={shortName(s.name)} color={KIT_COLOR.skill} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="w-12 shrink-0 text-[10px] uppercase tracking-wide text-[var(--ink-faint)]">acts</span>
          {tools.length > 0 ? tools.map((s) => <Chip key={s.id} label={shortName(s.name)} color={KIT_COLOR.tool} />) : <span className="text-[11px] text-[var(--ink-faint)]">reasons over context</span>}
        </div>
        {subs.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="w-12 shrink-0 text-[10px] uppercase tracking-wide text-[var(--ink-faint)]">calls</span>
            {subs.map((s) => (
              <Chip key={s.id} label={shortName(s.name)} color={KIT_COLOR.agent} />
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="mt-2 space-y-1.5 border-t border-[var(--line)] pt-2 text-[11px] text-[var(--ink-soft)]">
          <div className="font-mono text-[10px] text-[var(--ink-faint)]">{a.servicePrincipal}</div>
          {subs.length > 0 ? (
            <div>
              <div className="mb-0.5 text-[10px] uppercase tracking-wide text-[var(--ink-faint)]">its sub-agents</div>
              {subs.map((s) => (
                <div key={s.id} className="flex items-start gap-1.5">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full" style={{ background: KIT_COLOR.agent }} />
                  <span>
                    <b className="font-medium text-[var(--ink)]">{s.name}</b> · {s.type}
                    {s.ucPath && <span className="block font-mono text-[10px] text-[var(--ink-faint)]">reads {s.ucPath}</span>}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div>A single-step agent — no sub-agents. Its know-how is the skill above; its reach is the tools.</div>
          )}
        </div>
      )}
    </div>
  );
}

function StaticNode({ item, phase }: { item: FlowItem; phase: number }) {
  const tone =
    item.kind === 'gate'
      ? { bg: 'var(--warn-soft)', fg: 'var(--warn)', Icon: ShieldCheck }
      : item.kind === 'outcome'
        ? { bg: 'var(--ok-soft)', fg: 'var(--ok)', Icon: ArrowRight }
        : { bg: 'var(--canvas)', fg: 'var(--brand)', Icon: item.title?.includes('ServiceNow') ? Radio : item.title?.includes('Genie') ? Sparkles : Database };
  const Icon = tone.Icon;
  return (
    <div data-node data-phase={phase} className="rounded-xl border border-[var(--line)] p-2.5" style={{ background: tone.bg }}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4 shrink-0" style={{ color: tone.fg }} />
        <span className="text-sm font-semibold leading-tight">{item.title}</span>
      </div>
      {item.sub && <div className="mt-0.5 text-[11px] text-[var(--ink-soft)]">{item.sub}</div>}
      {item.note && <div className="mt-1 text-[11px] leading-snug text-[var(--ink-faint)]">{item.note}</div>}
    </div>
  );
}

export function PodFlow({ pod, agents, onPick }: { pod: PodDef; agents: RoleAgent[]; onPick: (id: string) => void }) {
  const phases = authorPhases(pod, agents);
  const innerRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<string[]>([]);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  // Draw curved connectors from each node's right edge to every node in the next phase (fan-out /
  // converge), measured from the DOM so they stay attached when a card is expanded or the page resizes.
  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const measure = () => {
      const base = inner.getBoundingClientRect();
      const groups = new Map<number, { left: number; right: number; mid: number }[]>();
      inner.querySelectorAll<HTMLElement>('[data-node]').forEach((el) => {
        const p = Number(el.dataset.phase);
        const r = el.getBoundingClientRect();
        if (!groups.has(p)) groups.set(p, []);
        groups.get(p)?.push({ left: r.left - base.left, right: r.right - base.left, mid: r.top - base.top + r.height / 2 });
      });
      const keys = [...groups.keys()].sort((a, b) => a - b);
      const ds: string[] = [];
      for (let i = 0; i < keys.length - 1; i++) {
        for (const a of groups.get(keys[i]) ?? []) {
          for (const b of groups.get(keys[i + 1]) ?? []) {
            const dx = Math.max(18, (b.left - a.right) / 2);
            ds.push(`M ${a.right.toString()} ${a.mid.toString()} C ${(a.right + dx).toString()} ${a.mid.toString()}, ${(b.left - dx).toString()} ${b.mid.toString()}, ${b.left.toString()} ${b.mid.toString()}`);
          }
        }
      }
      setPaths(ds);
      setDims({ w: inner.scrollWidth, h: inner.scrollHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(inner);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [pod.id]);

  return (
    <div>
      <p className="mb-3 text-sm text-[var(--ink-soft)]">
        A pod is a <b className="text-[var(--ink)]">team running a process</b>, not one agent. Work flows left to right
        through handoffs. Each agent is itself composed — a skill, its tools, and the sub-agents it delegates to.
        <span className="text-[var(--ink-faint)]"> Click a card to open it; expand the chevron to see the tree within.</span>
      </p>
      <div className="overflow-x-auto pb-2">
        <div ref={innerRef} className="relative flex min-w-max items-stretch gap-1">
          <svg className="pointer-events-none absolute left-0 top-0 z-0" width={dims.w} height={dims.h} aria-hidden="true">
            {paths.map((d) => (
              <path key={d} d={d} fill="none" stroke="var(--brand-line)" strokeWidth={1.75} />
            ))}
          </svg>
          {phases.map((ph, i) => (
            <div key={ph.title} className="relative z-10 flex items-stretch gap-1">
              {i > 0 && (
                <div className="flex w-16 shrink-0 items-center justify-center">
                  {ph.edge && <span className="rounded bg-[var(--canvas)] px-1.5 py-0.5 text-center text-[9px] leading-tight text-[var(--ink-faint)]">{ph.edge}</span>}
                </div>
              )}
              <div className="flex w-[220px] shrink-0 flex-col">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
                  {ph.title}
                  {ph.parallel && <span className="ml-1 font-normal normal-case text-[var(--ink-faint)]">· parallel</span>}
                </div>
                <div className="flex flex-1 flex-col justify-center gap-2">
                  {ph.items.map((item, k) =>
                    item.kind === 'agent' || item.kind === 'decision' ? (
                      <AgentNode key={item.agentId ?? k} agentId={item.agentId ?? ''} decision={item.kind === 'decision'} phase={i} onPick={onPick} />
                    ) : (
                      <StaticNode key={item.title ?? k} item={item} phase={i} />
                    ),
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

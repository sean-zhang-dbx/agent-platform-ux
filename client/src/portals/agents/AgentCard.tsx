import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Ban, BookOpen, Check, Database, Fingerprint, Plug, Power, ShieldAlert, SquareFunction, Bot } from 'lucide-react';
import type { RoleAgent } from '../../data/estate';
import { podById } from '../../data/estate';
import { PEOPLE, actionsFor, agentReach, agentVersion, blockedReason, denialsFor, effective, entraId, isYou, sponsorOf, stopsAt, triggersFor, type AccessItem, type Person } from '../../data/access';
import { WIRING_GAP } from '../../data/liveWiring';
import { SRP_AGENTS } from '../../data/pods';
import { Chip } from '../../components/ui';
import { cx } from '../../lib/format';
import { shortName } from '../../viz/palette';

// Two sets: what the agent is granted, and what the person can see. The agent only uses the overlap.
function Venn({ person, both, agentOnly }: { person: Person; both: number; agentOnly: number }) {
  const who = isYou(person) ? 'You' : person.name;
  return (
    <svg viewBox="0 0 184 112" className="h-[104px] w-[172px] shrink-0" role="img" aria-label={`${both.toString()} usable, ${agentOnly.toString()} hidden because ${who} lacks access`}>
      <text x="42" y="11" textAnchor="middle" className="fill-[var(--ink-soft)] text-[10px]">
        Agent’s grants
      </text>
      <text x="142" y="11" textAnchor="middle" className="fill-[var(--brand-strong)] text-[10px] font-semibold">
        {who}
      </text>
      <circle cx="66" cy="62" r="44" fill="#f3efeb" stroke="#3a3632" strokeWidth="1.5">
        <title>{`${agentOnly.toString()} the agent is granted but ${who} can’t see`}</title>
      </circle>
      <circle cx="118" cy="62" r="44" fill="var(--brand-soft)" fillOpacity="0.55" stroke="var(--brand)" strokeWidth="1.5">
        <title>{`${who}’s access`}</title>
      </circle>
      <path d="M92,26.4 A44,44 0 0,1 92,97.6 A44,44 0 0,1 92,26.4 Z" fill="var(--brand)" fillOpacity="0.28">
        <title>{`${both.toString()} usable in this run`}</title>
      </path>
      <text x="92" y="66" textAnchor="middle" className="fill-[var(--ink)] text-[18px] font-semibold">
        {both}
      </text>
      <text x="92" y="79" textAnchor="middle" className="fill-[var(--ink-soft)] text-[9px]">
        usable
      </text>
      <text x="46" y="66" textAnchor="middle" className="fill-[var(--ink-faint)] text-[14px] font-semibold">
        {agentOnly}
      </text>
      <text x="46" y="78" textAnchor="middle" className="fill-[var(--ink-faint)] text-[9px]">
        hidden
      </text>
    </svg>
  );
}

function Tile({ n, of, label, sub }: { n: number; of: number; label: string; sub: string }) {
  return (
    <div className={cx('rounded-lg bg-[var(--canvas)] px-3 py-2', of === 0 && 'opacity-40')}>
      <div className="text-lg font-semibold tabular-nums leading-tight">
        {n}
        {of > n && <span className="text-sm font-normal text-[var(--ink-faint)]"> of {of}</span>}
      </div>
      <div className="text-xs font-medium">{label}</div>
      <div className="text-[11px] text-[var(--ink-faint)]">{sub}</div>
    </div>
  );
}

function Row({ item, person }: { item: AccessItem; person: Person }) {
  const reason = blockedReason(person, item);
  return (
    <li className={cx('flex items-start gap-2 py-1.5', reason && 'opacity-55')}>
      {reason ? <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ink-faint)]" /> : <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ok)]" />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 text-sm">
          <span className={cx('font-medium', reason && 'line-through decoration-[var(--ink-faint)]')}>{item.label}</span>
          <span className={cx('rounded px-1 text-[10px] font-semibold uppercase', item.access === 'write' ? 'bg-[var(--warn-soft)] text-[var(--warn)]' : 'bg-[#f3efeb] text-[var(--ink-soft)]')}>{item.access}</span>
        </div>
        <div className="truncate font-mono text-[11px] text-[var(--ink-faint)]">
          {item.ref}
          {item.through && ` · via ${shortName(item.through)}`}
        </div>
        {reason && <div className="text-[11px] text-[var(--ink-soft)]">{reason}</div>}
      </div>
    </li>
  );
}

function Group({ icon, title, items, person }: { icon: ReactNode; title: string; items: AccessItem[]; person: Person }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-soft)]">
        {icon} {title}
      </div>
      <ul className="divide-y divide-[var(--line)]">
        {items.map((i) => (
          <Row key={i.key} item={i} person={person} />
        ))}
      </ul>
    </div>
  );
}

const TIER_TONE = ['neutral', 'neutral', 'warn', 'deny'] as const;

export function AgentCard({ agent, person, onPerson, run }: { agent: RoleAgent; person: Person; onPerson?: (id: string) => void; run?: { id: string; title: string } }) {
  const [suspended, setSuspended] = useState(false);
  const r = agentReach(agent);
  const eff = effective(r, person);
  const actions = actionsFor(r);
  const pod = podById(agent.podId);
  const denials = denialsFor(agent);
  const triggers = triggersFor(agent);
  const who = isYou(person) ? 'you' : person.name;
  const purpose = SRP_AGENTS.find((x) => x.id === agent.id)?.role;
  const count = (xs: AccessItem[]) => xs.filter((i) => blockedReason(person, i) === null).length;

  return (
    <article className={cx('overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm', suspended && 'opacity-70')}>
      <header className="flex items-start gap-3 bg-[#1f1d1b] px-4 py-3 text-white">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#3a3632]">
          <Fingerprint className="h-5 w-5 text-[var(--brand)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#cbbfb6]">Agent card</div>
          <div className="truncate font-semibold">{agent.name}</div>
          {purpose && <div className="text-xs text-[#e8ddd4]">{purpose}</div>}
          <div className="truncate text-xs text-[#cbbfb6]">
            v{agentVersion(agent)} · built by Northwind ·{' '}
            <Link to={`/pods/${agent.podId}`} className="hover:underline">
              {pod?.name}
            </Link>
          </div>
        </div>
        <span className={cx('flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', suspended ? 'bg-[var(--deny)] text-white' : 'bg-[#2f4a3a] text-[#9fe0b8]')}>
          <span className={cx('h-1.5 w-1.5 rounded-full', suspended ? 'bg-white' : 'bg-[#9fe0b8]')} />
          {suspended ? 'Suspended' : 'Active'}
        </span>
      </header>

      <section className="border-b border-[var(--line)] px-4 py-3">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brand-strong)]">Acting on behalf of</div>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand)] text-sm font-semibold text-white">{person.name.slice(0, 1)}</div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">
              {person.name} <span className="font-normal text-[var(--ink-soft)]">· {person.role}</span>
            </div>
            <div className="text-xs text-[var(--ink-faint)]">
              {run ? `Delegated when ${who} started ${run.id}. Ends with the run.` : `As if ${who} started the request. Triggers act for the pod owner.`}
            </div>
          </div>
          {onPerson && (
            <select value={person.id} onChange={(e) => onPerson(e.target.value)} aria-label="View as" className="rounded-lg border border-[var(--line)] bg-white px-2 py-1 text-xs">
              {PEOPLE.map((p) => (
                <option key={p.id} value={p.id}>
                  View as {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      <section className="border-b border-[var(--line)] px-4 py-3">
        <div className="mb-2 text-sm">
          <span className="font-semibold">For this outcome</span>
          {run && <span className="text-[var(--ink-soft)]"> · {run.title}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Venn person={person} both={eff.usable.length} agentOnly={eff.blocked.length} />
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
            <Tile n={count(r.systems)} of={r.systems.length} label="Systems" sub="via MCP" />
            <Tile n={count(r.tables)} of={r.tables.length} label="Tables" sub="via Unity Catalog" />
            <Tile n={count(r.functions)} of={r.functions.length} label="Functions" sub="via Unity Catalog" />
            <Tile n={r.agents.length} of={r.agents.length} label="Databricks agents" sub={`ask as ${who}`} />
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--ink-soft)]">
          The agent can never see more than {who} can.
          {eff.blocked.length > 0 && ` ${eff.blocked.length.toString()} of its grants are hidden for ${who}.`}
        </p>
      </section>

      <section className="space-y-3 border-b border-[var(--line)] px-4 py-3">
        <Group icon={<Plug className="h-3.5 w-3.5" />} title="Systems · MCP" items={r.systems} person={person} />
        <Group icon={<SquareFunction className="h-3.5 w-3.5" />} title="Functions · Unity Catalog" items={r.functions} person={person} />
        <Group icon={<Database className="h-3.5 w-3.5" />} title="Tables & documents · Unity Catalog" items={r.tables} person={person} />
        {r.systems.length + r.functions.length + r.tables.length === 0 && <div className="text-sm text-[var(--ink-faint)]">No direct data access. Works only from the other agents’ findings.</div>}
        {r.agents.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-soft)]">
              <Bot className="h-3.5 w-3.5" /> Works with
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {r.agents.map((g) => (
                <Chip key={g.id} tone="info">
                  {shortName(g.name)} · asks as {who}
                </Chip>
              ))}
            </div>
          </div>
        )}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-soft)]">
            <BookOpen className="h-3.5 w-3.5" /> Know-how
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {r.skills.map((s) => (
              <Chip key={s.id}>
                {s.name} {s.version}
              </Chip>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--line)] px-4 py-3">
        <div className="mb-1.5 text-sm font-semibold">What it can do</div>
        <ul className="space-y-1">
          {actions.map((x) => (
            <li key={x.label} className="flex items-center gap-2 text-sm">
              <Chip tone={TIER_TONE[x.tier]} className="w-8 justify-center">
                T{x.tier}
              </Chip>
              <span className="min-w-0 flex-1 truncate">{x.label}</span>
              <span className="shrink-0 text-xs text-[var(--ink-soft)]">{x.mode === 'on_behalf_of' ? `as ${who}` : 'as itself'}</span>
              <span className="hidden w-36 shrink-0 text-right text-xs text-[var(--ink-faint)] sm:block">{x.gate}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--ink-soft)]">
          <ShieldAlert className="h-3.5 w-3.5 text-[var(--deny)]" /> Never: {stopsAt(agent).toLowerCase()}
        </div>
      </section>

      <footer className="space-y-2 bg-[var(--canvas)] px-4 py-3 text-xs text-[var(--ink-soft)]">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[var(--ink-faint)]">Runs as</span>
          <span className="font-mono text-[var(--ink)]">{entraId(agent)}</span>
          <span className="text-[var(--ink-faint)]">→</span>
          <span className="font-mono">{agent.servicePrincipal}</span>
          <Chip tone="info" title={WIRING_GAP}>
            target state
          </Chip>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            Sponsor <b className="font-medium text-[var(--ink)]">{sponsorOf(agent)}</b> · attested Aug 2026
            {triggers.length > 0 && ` · ${triggers.length.toString()} trigger${triggers.length === 1 ? '' : 's'}`}
            {denials.length > 0 && ` · ${denials.length.toString()} denied call${denials.length === 1 ? '' : 's'} this month`}
          </span>
          <button
            type="button"
            onClick={() => setSuspended((s) => !s)}
            className={cx('flex items-center gap-1 rounded-lg border px-2 py-1 font-medium', suspended ? 'border-[var(--line)] bg-white text-[var(--ink)]' : 'border-[var(--deny)] text-[var(--deny)] hover:bg-[var(--deny-soft)]')}
            title="Kill switch: disabling the identity stops this agent in every pod (simulated)"
          >
            <Power className="h-3.5 w-3.5" /> {suspended ? 'Re-enable' : 'Suspend'}
          </button>
        </div>
      </footer>
    </article>
  );
}

// Outcome-level summary across every agent in a run.
export function RunAccessSummary({ agents, person }: { agents: RoleAgent[]; person: Person }) {
  const reaches = agents.map(agentReach);
  const all = reaches.flatMap((r) => [...r.systems, ...r.functions, ...r.tables]);
  const uniq = [...new Map(all.map((i) => [i.key, i])).values()];
  const usable = uniq.filter((i) => blockedReason(person, i) === null);
  const n = (g: AccessItem['group']) => usable.filter((i) => i.group === g).length;
  const who = isYou(person) ? 'you' : person.name;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[var(--brand-line)] bg-[var(--brand-soft)] px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-[var(--brand)] text-sm font-semibold text-white">{person.name.slice(0, 1)}</div>
        <div>
          <div className="font-semibold">
            {agents.length} agents acted for {who}
          </div>
          <div className="text-xs text-[var(--ink-soft)]">{person.role}</div>
        </div>
      </div>
      <span>
        <b className="tabular-nums">{n('system')}</b> systems via MCP
      </span>
      <span>
        <b className="tabular-nums">{n('table')}</b> tables via UC
      </span>
      <span>
        <b className="tabular-nums">{n('function')}</b> functions
      </span>
      {uniq.length > usable.length && <span className="text-[var(--ink-soft)]">{uniq.length - usable.length} hidden: {who} {isYou(person) ? 'lack' : 'lacks'} access</span>}
    </div>
  );
}

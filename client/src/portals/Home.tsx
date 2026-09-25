import { Link, useNavigate } from 'react-router';
import { AlertTriangle, ArrowRight, BadgeCheck, ClipboardCheck, PenLine, Rocket, UserRound } from 'lucide-react';
import { useStore } from '../state/store';
import { ALL_AGENTS, CAPABILITIES, DAYS, DENIALS, DOMAINS, POD_LIST, ROLE_AGENTS, WORK_ITEMS, dailyRuns, gxpHold } from '../data/estate';
import { Chip, PageHeader, Panel } from '../components/ui';
import { Kpi, SectionTitle, Sparkline } from '../components/bits';
import { money } from '../lib/format';

function RunsChart({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const W = 720;
  const H = 150;
  const bw = W / values.length;
  return (
    <svg viewBox={`0 0 ${W.toString()} ${(H + 18).toString()}`} className="w-full" role="img" aria-label="Pod runs per day, last 30 days">
      {[0.5, 1].map((f) => (
        <line key={f} x1={0} x2={W} y1={H - f * (H - 10)} y2={H - f * (H - 10)} stroke="#f0ebe6" />
      ))}
      {values.map((v, i) => {
        const h = (v / max) * (H - 10);
        return (
          <g key={DAYS[i]}>
            <rect x={i * bw + 2} y={H - h} width={bw - 4} height={Math.max(1, h)} rx={3} fill="var(--brand)" opacity={0.85}>
              <title>{`${DAYS[i]}: ${v.toString()} runs`}</title>
            </rect>
          </g>
        );
      })}
      {[0, 7, 14, 21, 29].map((i) => (
        <text key={i} x={i === 0 ? 2 : i === 29 ? W - 2 : i * bw + bw / 2} y={H + 14} textAnchor={i === 0 ? 'start' : i === 29 ? 'end' : 'middle'} fontSize="10" fill="#8a8a8a">
          {DAYS[i]}
        </text>
      ))}
    </svg>
  );
}

export function HomePage() {
  const { state, domain, setDomain } = useStore();
  const navigate = useNavigate();
  const inDomain = <T extends { domainId: string }>(xs: T[]) => (domain === 'all' ? xs : xs.filter((x) => x.domainId === domain));
  const caps = inDomain(CAPABILITIES);
  const pods = inDomain(POD_LIST);
  const agents = inDomain(ROLE_AGENTS);
  const platform = inDomain(ALL_AGENTS.filter((a) => a.builtBy !== 'Northwind'));
  const work = inDomain(WORK_ITEMS);
  const runs = dailyRuns(domain);
  const totalRuns = runs.reduce((a, b) => a + b, 0);
  const spend = caps.reduce((s, c) => s + c.runs30d * c.costPerRun, 0);
  const domainName = domain === 'all' ? 'All domains' : (DOMAINS.find((d) => d.id === domain)?.name ?? '');
  const skillsCertified = state.skills.filter((s) => s.type === 'UC Skill' && s.status === 'Certified' && (domain === 'all' || s.domain === domainName)).length;
  const signoff = work.filter((w) => w.status === 'Needs sign-off').length + state.requests.filter((r) => r.status === 'pending_approval' && !r.archived).length;
  const tasks = work.filter((w) => w.kind === 'Human task' && w.status === 'Open');
  const holds = caps.filter((c) => gxpHold(c).length > 0);
  const candidates = caps.filter((c) => c.hasCandidate);
  const review = state.skills.filter((s) => s.status === 'Under Review' && (domain === 'all' || s.domain === domainName));
  const top = [...caps].sort((a, b) => b.runs30d - a.runs30d).slice(0, 6);

  return (
    <div>
      <PageHeader title="Digital workforce" sub={`${domainName} · last 30 days`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Capabilities live" value={caps.filter((c) => c.status === 'Live').length} sub={`${caps.length.toString()} total`} to="/capabilities" />
        <Kpi label="Pods active" value={pods.filter((p) => p.status === 'Active').length} sub={`${pods.length.toString()} total`} to="/pods" />
        <Kpi label="Agents" value={agents.length + platform.length} sub={`${agents.length.toString()} Northwind-built · ${platform.length.toString()} Databricks`} to="/agents" />
        <Kpi label="Skills certified" value={skillsCertified} sub={`${review.length.toString()} awaiting review`} to="/skills" />
        <Kpi label="Pod runs" value={totalRuns.toLocaleString()} sub="last 30 days" to="/work" />
        <Kpi label="Spend" value={money(spend)} sub="via AI Gateway" to="/governance?tab=spend" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel className="p-5">
          <SectionTitle right={<span className="text-xs text-[var(--ink-faint)]">hover a bar for the day</span>}>Pod runs per day</SectionTitle>
          <RunsChart values={runs} />
        </Panel>

        <Panel className="p-5">
          <SectionTitle>Needs attention</SectionTitle>
          <div className="space-y-2">
            {[
              { icon: PenLine, label: 'Waiting for your sign-off', n: signoff, to: '/work?tab=signoff', tone: 'brand' as const },
              { icon: UserRound, label: 'Human tasks pods are waiting on', n: tasks.length, to: '/work?tab=tasks', tone: 'warn' as const },
              { icon: AlertTriangle, label: 'GxP capabilities using Beta / Preview features', n: holds.length, to: '/governance?tab=maturity', tone: 'deny' as const },
              { icon: Rocket, label: 'Pod versions ready to promote', n: candidates.length, to: '/capabilities?filter=candidate', tone: 'ok' as const },
              { icon: ClipboardCheck, label: 'Skills awaiting certification', n: review.length, to: '/governance?tab=certification', tone: 'info' as const },
              { icon: BadgeCheck, label: 'Access denials logged', n: inDomain(DENIALS).length, to: '/governance?tab=denials', tone: 'neutral' as const },
            ].map((r) => (
              <Link key={r.label} to={r.to} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-[var(--canvas)]">
                <r.icon className="h-4 w-4 text-[var(--ink-faint)]" />
                <span className="flex-1 text-sm">{r.label}</span>
                <Chip tone={r.tone}>{r.n}</Chip>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--ink-faint)]" />
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-5">
        <SectionTitle right={<span className="text-xs text-[var(--ink-faint)]">click a domain to filter the whole app</span>}>Domains</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {DOMAINS.map((d) => {
            const dc = CAPABILITIES.filter((c) => c.domainId === d.id);
            const dr = dailyRuns(d.id);
            const selected = domain === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setDomain(selected ? 'all' : d.id)}
                className={`rounded-xl border bg-white p-4 text-left transition hover:border-[var(--brand-line)] ${selected ? 'border-2 border-[var(--brand)]' : 'border-[var(--line)]'} ${domain !== 'all' && !selected ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{d.name}</span>
                  {d.gxp && <Chip tone="warn">GxP</Chip>}
                </div>
                <div className="mt-0.5 text-xs text-[var(--ink-faint)]">{d.bu}</div>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div className="text-xs text-[var(--ink-soft)]">
                    <div>
                      <b className="text-[var(--ink)]">{dc.length}</b> capabilities · <b className="text-[var(--ink)]">{POD_LIST.filter((p) => p.domainId === d.id).length}</b> pods
                    </div>
                    <div>
                      <b className="text-[var(--ink)]">{dr.reduce((a, b) => a + b, 0).toLocaleString()}</b> runs · {money(dc.reduce((s, c) => s + c.runs30d * c.costPerRun, 0))}
                    </div>
                  </div>
                  <Sparkline values={dr} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <SectionTitle right={<Link to="/capabilities" className="text-sm font-medium text-[var(--brand-strong)] hover:underline">All capabilities →</Link>}>Most-used capabilities</SectionTitle>
        <Panel className="divide-y divide-[var(--line)] overflow-hidden">
          {top.map((c) => (
            <button key={c.id} type="button" onClick={() => void navigate(`/capabilities/${c.id}`)} className="flex w-full items-center gap-4 px-4 py-2.5 text-left hover:bg-[var(--brand-soft)]/50">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{c.name}</div>
                <div className="text-xs text-[var(--ink-faint)]">{c.domain}</div>
              </div>
              <Sparkline values={c.trend} />
              <span className="w-20 text-right text-sm tabular-nums">{c.runs30d.toLocaleString()} runs</span>
              <span className="hidden w-16 text-right text-sm tabular-nums text-[var(--ink-soft)] md:block">{Math.round(c.successRate * 100)}%</span>
            </button>
          ))}
        </Panel>
      </div>
    </div>
  );
}

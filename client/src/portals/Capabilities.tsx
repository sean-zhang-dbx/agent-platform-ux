import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Boxes,
  Brain,
  Gauge,
  MapPin,
  MessageSquare,
  Plus,
  ShieldCheck,
  Waypoints,
} from 'lucide-react';
import { useStore } from '../state/store';
import { SRA_ID, type Capability, type ContextSource } from '../data/capabilities';
import { DOMAINS, PLATFORM, WORK_ITEMS, gxpHold, podById, podMemberCount, podPlatformAgents } from '../data/estate';
import { Chip, PageHeader, Panel, PrimaryButton, SecondaryButton } from '../components/ui';
import { DataTable, FilterSelect, type Column } from '../components/DataTable';
import { MaturityBadge, Sparkline } from '../components/bits';
import { cx, money } from '../lib/format';
import { LinkMap } from '../viz/LinkMap';
import { KIT_COLOR } from '../viz/palette';
import { PodVersions } from './agents/PodVersions';
import { ManifestPanel } from '../components/Manifest';
import { capabilityManifest } from '../data/manifest';

function Ingredients({ c }: { c: Capability }) {
  return (
    <span className="flex items-center gap-2 text-xs tabular-nums text-[var(--ink-soft)]">
      {(
        [
          ['skill', c.skills.length],
          ['tool', c.tools.length],
          ['data', c.data.length],
        ] as const
      ).map(([k, n]) => (
        <span key={k} className="flex items-center gap-1" title={`${n.toString()} ${k}${n === 1 ? '' : 's'}`}>
          <span className="h-2 w-2 rounded-full" style={{ background: KIT_COLOR[k] }} />
          {n}
        </span>
      ))}
    </span>
  );
}

export function CapabilitiesPortal() {
  const { domain, capabilities } = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState('all');
  const [gxp, setGxp] = useState(params.get('filter') === 'hold' ? 'hold' : 'all');
  const candidateOnly = params.get('filter') === 'candidate';

  const rows = capabilities.filter(
    (c) =>
      (domain === 'all' || c.domainId === domain) &&
      (status === 'all' || c.status === status) &&
      (gxp === 'all' || (gxp === 'gxp' ? c.gxp : gxp === 'hold' ? gxpHold(c).length > 0 : !c.gxp)) &&
      (!candidateOnly || c.hasCandidate)
  );

  const columns: Column<Capability>[] = [
    {
      key: 'name',
      header: 'Capability',
      sort: (c) => c.name,
      render: (c) => (
        <div>
          <div className="font-medium">{c.name}</div>
          <div className="text-xs text-[var(--ink-faint)]">{c.domain}</div>
        </div>
      ),
    },
    { key: 'kit', header: 'Skills · tools · data', render: (c) => <Ingredients c={c} />, hideBelow: 'md' },
    {
      key: 'pod',
      header: 'Pod',
      render: (c) => <span className="text-[var(--ink-soft)]">{c.podId ? podById(c.podId)?.name : '—'}</span>,
      hideBelow: 'lg',
      sort: (c) => (c.podId ? (podById(c.podId)?.name ?? '') : ''),
    },
    {
      key: 'trend',
      header: 'Runs · 30d',
      render: (c) => <Sparkline values={c.trend} width={80} height={20} />,
      hideBelow: 'md',
    },
    {
      key: 'runs',
      header: 'Runs',
      align: 'right',
      sort: (c) => c.runs30d,
      render: (c) => <span className="tabular-nums">{c.runs30d.toLocaleString()}</span>,
    },
    {
      key: 'success',
      header: 'Success',
      align: 'right',
      sort: (c) => c.successRate,
      render: (c) => <span className="tabular-nums">{Math.round(c.successRate * 100)}%</span>,
      hideBelow: 'lg',
    },
    {
      key: 'cost',
      header: 'Cost / run',
      align: 'right',
      sort: (c) => c.costPerRun,
      render: (c) => <span className="tabular-nums">{money(c.costPerRun)}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      sort: (c) => c.status,
      render: (c) => (
        <span className="inline-flex items-center gap-1.5">
          {gxpHold(c).length > 0 && (
            <span title="GxP capability that depends on Beta / Preview features">
              <AlertTriangle className="h-3.5 w-3.5 text-[var(--warn)]" />
            </span>
          )}
          {c.hasCandidate && <Chip tone="brand">candidate</Chip>}
          {c.inReview && <Chip tone="info">in certification</Chip>}
          <Chip tone={c.status === 'Live' ? 'ok' : 'warn'}>{c.status}</Chip>
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Capabilities"
        sub="What Northwind can do, packaged: skills + tools + data + context."
        right={
          <PrimaryButton onClick={() => void navigate('/capabilities/new')}>
            <Plus className="h-4 w-4" /> New capability
          </PrimaryButton>
        }
      />
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(c) => c.id}
        onRow={(c) => void navigate(`/capabilities/${c.id}`)}
        search={(c) => `${c.name} ${c.domain} ${c.owner}`}
        placeholder="Search capabilities"
        initialSort={{ key: 'runs', dir: 'desc' }}
        toolbar={
          <>
            <FilterSelect
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                ['all', 'Any status'],
                ['Live', 'Live'],
                ['Draft', 'Draft'],
              ]}
            />
            <FilterSelect
              label="GxP"
              value={gxp}
              onChange={setGxp}
              options={[
                ['all', 'GxP and non-GxP'],
                ['gxp', 'GxP only'],
                ['non', 'Non-GxP only'],
                ['hold', 'GxP on Beta / Preview'],
              ]}
            />
            {candidateOnly && (
              <Link to="/capabilities">
                <Chip tone="brand">With a candidate version ✕</Chip>
              </Link>
            )}
          </>
        }
      />
    </div>
  );
}

// ── Detail ────────────────────────────────────────────────────────────────────

function RequestContext({ c }: { c: Capability }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-soft)]">
        <MapPin className="h-3.5 w-3.5 text-[var(--brand)]" /> From the request
      </div>
      <div className="space-y-1.5">
        {c.context.map((x) => (
          <div key={x.key} className="flex justify-between gap-2 text-sm">
            <span className="text-[var(--ink-faint)]">{x.key}</span>
            <span className="text-right font-medium">{x.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OntologyRules({ c }: { c: Capability }) {
  return (
    <div className="grid gap-2 lg:grid-cols-2">
      {c.ontology.map((o) => (
        <div key={o.text} className="rounded-lg border border-[var(--line)] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[var(--ink-soft)]">{o.kind}</span>
            {o.origin === 'Curated' ? (
              <Chip tone="ok">
                <BadgeCheck className="h-3 w-3" /> Curated
              </Chip>
            ) : (
              <Chip>Inferred</Chip>
            )}
          </div>
          <p className="mt-1.5 text-sm">{o.text}</p>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--ink-faint)]">
            <span className="min-w-0 flex-1 truncate" title={o.source}>
              {o.source}
            </span>
            <span
              className="h-1.5 w-14 overflow-hidden rounded-full bg-[#eee8e2]"
              title={`Authority ${o.authority.toFixed(2)}`}
            >
              <span
                className="block h-full rounded-full bg-[var(--ink-soft)]"
                style={{ width: `${(o.authority * 100).toString()}%` }}
              />
            </span>
            <span className="tabular-nums">{o.authority.toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Simple two-column view: request context + ontology rules. Used by every capability that has not
// been authored with explicit context sources.
function SimpleContextPanel({ c }: { c: Capability }) {
  return (
    <Panel className="overflow-hidden">
      <div className="grid md:grid-cols-[15rem_1fr]">
        <div className="border-b border-[var(--line)] p-4 md:border-r md:border-b-0">
          <RequestContext c={c} />
        </div>
        <div className="p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[var(--ink-soft)]">From Genie Ontology</span>
            <MaturityBadge status="Public Preview" />
            <span className="text-xs text-[var(--ink-faint)]">shared with Genie One and Genie Code</span>
          </div>
          <OntologyRules c={c} />
          <div className="mt-2 text-[11px] text-[var(--ink-faint)]">
            Authority reflects source, usage and freshness. Pod agents get this context by asking Genie One.
          </div>
        </div>
      </div>
    </Panel>
  );
}

const LANE_META: Record<ContextSource['lane'], string> = {
  Lakehouse: 'var(--brand)',
  Regulated: '#4a3aa7',
  Collaboration: 'var(--info)',
};

function SourceCard({ s }: { s: ContextSource }) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--line)] bg-white p-3">
      <div className="flex items-baseline gap-1.5">
        <span className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-full" style={{ background: LANE_META[s.lane] }} />
        <span className="text-sm font-semibold">{s.name}</span>
        <span className="text-[11px] text-[var(--ink-faint)]">{s.lane}</span>
      </div>
      <ul className="mt-2 space-y-1">
        {s.items.map((it) => {
          const code = it.via === 'table' || it.via === 'metric view' || it.via === 'graph';
          return (
            <li key={it.name} className="flex items-center justify-between gap-2">
              <span
                className={cx('min-w-0 truncate text-[12px] text-[var(--ink-soft)]', code && 'font-mono text-[11px]')}
                title={it.name}
              >
                {it.name}
              </span>
              <span className="shrink-0 rounded bg-[var(--canvas)] px-1.5 py-0.5 text-[10px] text-[var(--ink-faint)]">
                {it.via}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Curved connectors fanning from the bottom-centre of Genie One down to each source tile's top-centre.
function Connectors({ n }: { n: number }) {
  return (
    <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="h-10 w-full" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const cx = ((i + 0.5) / n) * 100;
        return (
          <path
            key={i}
            d={`M 50 0 C 50 7, ${cx.toString()} 3, ${cx.toString()} 10`}
            fill="none"
            stroke="var(--ink-faint)"
            strokeWidth={1.25}
            vectorEffect="non-scaling-stroke"
            opacity={0.65}
          />
        );
      })}
    </svg>
  );
}

// Layered view: Genie One (MCP) is the single context layer; it federates the semantic sources below,
// with agentic memory persisted in Lakebase. Compact by design — this is the demo's centrepiece.
function LayeredContextPanel({ c }: { c: Capability }) {
  const sources = c.contextSources ?? [];
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--ink-soft)]">
        Agents don&apos;t wire to sources. They ask <b className="text-[var(--ink)]">Genie One</b> — the context layer —
        which federates the sources below and returns permission-aware answers.
      </p>

      {/* The context layer, its connectors, and the sources it federates */}
      <div>
        <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white p-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--canvas)] text-[var(--ink-soft)]">
            <Waypoints className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Genie One</span>
              <span className="rounded border border-[var(--line)] px-1 font-mono text-[10px] text-[var(--ink-faint)]">
                MCP
              </span>
            </div>
            <div className="truncate text-xs text-[var(--ink-soft)]">
              The context layer across agents, cloud &amp; systems · returns only what the person can see
            </div>
          </div>
        </div>
        <Connectors n={sources.length} />
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${sources.length.toString()}, minmax(0, 1fr))` }}>
          {sources.map((s) => (
            <SourceCard key={s.id} s={s} />
          ))}
        </div>
      </div>

      {/* Memory + request context, side by side and compact */}
      <div className="grid gap-2 md:grid-cols-2">
        {c.memory && (
          <div className="flex items-start gap-2.5 rounded-lg border border-[var(--line)] bg-white p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-strong)]">
              <Brain className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-sm">
                <b>Agent memory</b> <span className="text-[var(--ink-faint)]">· {c.memory.store}</span>
              </div>
              <p className="text-[13px] leading-snug text-[var(--ink-soft)]">{c.memory.note}</p>
            </div>
          </div>
        )}
        <div className="rounded-lg border border-[var(--line)] bg-white p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
            <MapPin className="h-3.5 w-3.5 text-[var(--brand)]" /> From the request
          </div>
          <div className="flex flex-wrap gap-1.5">
            {c.context.map((x) => (
              <span key={x.key} className="rounded-md bg-[var(--canvas)] px-2 py-0.5 text-[12px] text-[var(--ink-soft)]">
                <span className="text-[var(--ink-faint)]">{x.key}</span> {x.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Genie Ontology rules — compact, no scores or badges */}
      {c.ontology.length > 0 && (
        <div className="rounded-lg bg-[var(--canvas)] px-3 py-2.5">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
            Rules Genie One applies
          </div>
          <ul className="space-y-1">
            {c.ontology.slice(0, 2).map((o) => (
              <li key={o.text} className="flex gap-2 text-[13px] text-[var(--ink-soft)]">
                <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ok)]" />
                <span>{o.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ContextPanel({ c }: { c: Capability }) {
  if (c.contextSources && c.contextSources.length > 0) return <LayeredContextPanel c={c} />;
  return <SimpleContextPanel c={c} />;
}

function ControlsPanel({ c }: { c: Capability }) {
  return (
    <div className="space-y-5">
      <Panel className="overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 bg-[var(--canvas)] px-4 py-2 text-xs font-medium text-[var(--ink-faint)]">
          <span>Declared by the skill</span>
          <span className="w-4" />
          <span>Enforced by the platform</span>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {c.controls.map((ctl) => (
            <div key={ctl.declared} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2.5 text-sm">
              <span>{ctl.declared}</span>
              <ArrowRight className="h-4 w-4 text-[var(--ink-faint)]" />
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="h-4 w-4 text-[var(--ok)]" />
                {ctl.enforcedBy}
              </span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="p-4">
        <div className="mb-3 flex items-center gap-2 font-semibold">
          <Gauge className="h-4 w-4 text-[var(--brand)]" /> Acceptance checks
          <span className="text-sm font-normal text-[var(--ink-faint)]">
            · scored on every run, and used to test new versions
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {c.checks.map((k) => (
            <div key={k.name} className="rounded-lg bg-[var(--canvas)] px-3 py-2">
              <div className="text-sm font-medium">{k.name}</div>
              <div className="text-xs text-[var(--ink-soft)]">{k.target}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Activity({ c }: { c: Capability }) {
  const { state } = useStore();
  const navigate = useNavigate();
  const live = state.requests.filter((r) => r.capabilityId === c.id);
  const items = WORK_ITEMS.filter((w) => w.capabilityId === c.id);
  return (
    <Panel className="divide-y divide-[var(--line)] overflow-hidden">
      {live.length + items.length === 0 && (
        <div className="p-8 text-center text-sm text-[var(--ink-soft)]">No recent activity.</div>
      )}
      {live.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => void navigate(`/work/${r.id}`)}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-[var(--brand-soft)]/50"
        >
          <span className="w-16 font-mono text-xs text-[var(--ink-faint)]">{r.id}</span>
          <span className="flex-1 truncate">{r.title}</span>
          <span className="text-xs text-[var(--ink-faint)]">{r.createdAt}</span>
          <Chip tone={r.status === 'completed' ? 'ok' : 'warn'}>{r.status.replace('_', ' ')}</Chip>
        </button>
      ))}
      {items.map((w) => (
        <div key={w.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
          <span className="w-16 font-mono text-xs text-[var(--ink-faint)]">{w.id}</span>
          <span className="flex-1 truncate">{w.title}</span>
          <Chip>{w.kind}</Chip>
          <Chip tone={w.status === 'Done' ? 'ok' : w.status === 'Running' ? 'brand' : 'warn'}>{w.status}</Chip>
        </div>
      ))}
    </Panel>
  );
}

const TABS = ['Overview', 'Context', 'Manifest', 'Controls & checks', 'Versions', 'Activity'] as const;

export function CapabilityDetailPage() {
  const { capId } = useParams();
  const { state, capabilities } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const c = capabilities.find((x) => x.id === capId);

  if (!c)
    return (
      <Panel className="p-10 text-center text-sm text-[var(--ink-soft)]">
        Capability not found.{' '}
        <Link to="/capabilities" className="font-medium text-[var(--brand-strong)]">
          Back
        </Link>
      </Panel>
    );

  const pod = c.podId ? podById(c.podId) : undefined;
  const flagship = c.id === SRA_ID;
  const version = flagship ? state.liveVersion : c.version;
  const hold = gxpHold(c);
  const domain = DOMAINS.find((d) => d.id === c.domainId);

  return (
    <div>
      <PageHeader
        title={c.name}
        sub={`${c.owner} · ${c.domain}`}
        right={
          <div className="flex gap-2">
            {pod && (
              <SecondaryButton onClick={() => void navigate(`/pods/${pod.id}`)}>
                <Boxes className="h-4 w-4" /> Open pod
              </SecondaryButton>
            )}
            <PrimaryButton onClick={() => void navigate(`/ask?cap=${c.id}`)} disabled={c.status === 'Draft'}>
              <MessageSquare className="h-4 w-4" /> Use in Ask
            </PrimaryButton>
          </div>
        }
      />

      <div className="-mt-3 mb-5 flex flex-wrap items-center gap-2">
        <Chip tone={c.status === 'Live' ? 'ok' : 'warn'}>{c.status}</Chip>
        <Chip tone="brand">{version}</Chip>
        {c.gxp ? <Chip tone="warn">GxP</Chip> : <Chip>Non-GxP</Chip>}
        {hold.length > 0 && (
          <Chip tone="deny">
            <AlertTriangle className="h-3 w-3" /> Uses {hold.length} Beta / Preview features
          </Chip>
        )}
        {c.hasCandidate && <Chip tone="brand">Candidate version in evaluation</Chip>}
        {c.inReview && <Chip tone="info">Submitted for certification</Chip>}
        {!c.podId && <Chip>No pod yet</Chip>}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0">
          <div className="mb-4 flex w-fit flex-wrap gap-1 rounded-xl bg-[#f3efeb] p-1">
            {TABS.filter((t) => t !== 'Controls & checks' || c.controls.length + c.checks.length > 0).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cx(
                  'rounded-lg px-3 py-1.5 text-sm font-medium',
                  tab === t ? 'bg-white shadow-sm' : 'text-[var(--ink-soft)]'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Overview' && (
            <div className="space-y-5">
              {c.status === 'Draft' && c.runs30d === 0 ? (
                <Panel className="px-4 py-3 text-sm text-[var(--ink-soft)]">
                  <b className="text-[var(--ink)]">Not running yet.</b>{' '}
                  {c.inReview
                    ? 'Once certified, a pod can be drafted for it and it becomes available in Ask.'
                    : 'Submit it for certification to make it available to pods.'}
                </Panel>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {(
                    [
                      ['Runs · 30d', c.runs30d.toLocaleString(), true],
                      ['Success', `${Math.round(c.successRate * 100).toString()}%`, false],
                      ['Reviewer effort', `${c.reviewerMin.toString()} min`, false],
                      ['Cost / run', money(c.costPerRun), false],
                    ] as [string, string, boolean][]
                  ).map(([label, value, spark]) => (
                    <Panel key={label} className="px-4 py-3">
                      <div className="text-xs text-[var(--ink-faint)]">{label}</div>
                      <div className="mt-0.5 flex items-end justify-between gap-2">
                        <span className="text-xl font-semibold tabular-nums">{value}</span>
                        {spark && <Sparkline values={c.trend} width={72} height={18} />}
                      </div>
                    </Panel>
                  ))}
                </div>
              )}
              <Panel className="p-4">
                <LinkMap capability={c} />
              </Panel>
              <button
                type="button"
                onClick={() => setTab('Context')}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-left text-sm hover:border-[var(--brand-line)]"
              >
                <MapPin className="h-4 w-4 text-[var(--brand)]" />
                <span className="flex-1">
                  <b>Context:</b> {c.context.map((x) => (x.value === 'set per request' ? x.key : x.value)).join(' · ')}{' '}
                  {c.contextSources && c.contextSources.length > 0 ? (
                    <span className="text-[var(--ink-faint)]">
                      + {c.contextSources.length} sources via Genie One (MCP)
                      {c.memory ? ' · Lakebase memory' : ''}
                    </span>
                  ) : (
                    <span className="text-[var(--ink-faint)]">+ {c.ontology.length} Genie Ontology snippets</span>
                  )}
                </span>
                <ArrowRight className="h-4 w-4 text-[var(--ink-faint)]" />
              </button>
            </div>
          )}
          {tab === 'Context' && <ContextPanel c={c} />}
          {tab === 'Manifest' && <ManifestPanel bundle={capabilityManifest(c, state.skills)} />}
          {tab === 'Controls & checks' && <ControlsPanel c={c} />}
          {tab === 'Versions' &&
            (flagship ? (
              <PodVersions />
            ) : (
              <Panel className="p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-xl border-2 border-[var(--ok)] px-4 py-3">
                    <div className="text-lg font-semibold">{c.version}</div>
                    <Chip tone="ok">Live</Chip>
                  </div>
                  {c.hasCandidate ? (
                    <div className="rounded-xl border-2 border-dashed border-[var(--brand)] px-4 py-3">
                      <div className="text-lg font-semibold">
                        {c.version.replace(/\d+$/, (m) => String(Number(m) + 1))}
                      </div>
                      <Chip tone="brand">Candidate · evaluating</Chip>
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--ink-soft)]">
                      No candidate yet. Corrections at sign-off feed the next one.
                    </span>
                  )}
                </div>
                <p className="mt-3 text-xs text-[var(--ink-faint)]">
                  Author a submission dossier shows the full evaluate → approve → promote flow.
                </p>
              </Panel>
            ))}
          {tab === 'Activity' && <Activity c={c} />}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Panel className="p-4 text-sm">
            <div className="mb-2 text-xs font-semibold text-[var(--ink-faint)]">Facts</div>
            <dl className="space-y-1.5">
              {[
                ['Domain', c.domain],
                ['Business unit', domain?.bu ?? ''],
                ['Owner', c.owner],
                ['Version', version],
                ['Pod', pod?.name ?? '—'],
                [
                  'Agents',
                  pod
                    ? `${podMemberCount(pod).toString()} (${pod.agentIds.length.toString()} Northwind · ${podPlatformAgents(pod).length.toString()} Databricks)`
                    : '—',
                ],
                ['Autonomy', pod?.autonomyTier.split(' · ')[0] ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-[var(--ink-faint)]">{k}</dt>
                  <dd className="text-right font-medium">
                    {k === 'Pod' && pod ? (
                      <Link to={`/pods/${pod.id}`} className="hover:underline">
                        {v}
                      </Link>
                    ) : (
                      v
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel className="p-4">
            <div className="mb-2 text-xs font-semibold text-[var(--ink-faint)]">Built on</div>
            <ul className="space-y-1.5">
              {c.deps.map((id) => {
                const p = PLATFORM.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <li key={id} className="text-sm">
                    <span className="truncate" title={p.note}>
                      {p.name}
                    </span>
                  </li>
                );
              })}
            </ul>
            {hold.length > 0 && (
              <div className="mt-3 rounded-lg bg-[var(--warn-soft)] p-2.5 text-xs">
                GxP capability on Beta / Preview features. Run on non-GxP data until these reach GA (per Code Orange
                policy, to confirm).
              </div>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

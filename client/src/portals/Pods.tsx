import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { MessageSquare, Play, Search, ShieldCheck } from 'lucide-react';
import { useStore } from '../state/store';
import { ITSP_ID, SRP_ID, gatesForPod } from '../data/pods';
import { isOperationalPod } from '../data/itservice';
import { CAPABILITIES, POD_LIST, WORK_ITEMS, podById, podMemberCount, podPlatformAgents, roleAgentById, type PodDef, type RoleAgent } from '../data/estate';
import { Chip, PageHeader, Panel, PrimaryButton, SecondaryButton } from '../components/ui';
import { PodAccountability } from '../components/Approvals';
import { OperatingModel, OpsConsole } from '../components/OperatingModel';
import { LiveOpsButton } from '../components/LiveOps';
import { FilterSelect } from '../components/DataTable';
import { SectionTitle } from '../components/bits';
import { ManifestPanel } from '../components/Manifest';
import { podManifest } from '../data/manifest';
import { money } from '../lib/format';
import { PodFlow } from '../viz/PodFlow';
import { PodThumb } from '../viz/PodThumb';
import type { Kit } from '../viz/palette';
import { PodVersions } from './agents/PodVersions';
import { AgentDrawer } from './Agents';
import { SkillDrawer } from './Skills';

function agentsOf(p: PodDef): RoleAgent[] {
  return p.agentIds.map((id) => roleAgentById(id)).filter((a) => a !== undefined);
}

function kits(p: PodDef): Kit[][] {
  return [...agentsOf(p).map((a) => [...a.skills.map((): Kit => 'skill'), ...a.tools.map((): Kit => 'tool')]), ...podPlatformAgents(p).map((): Kit[] => ['agent'])];
}

function StatusChip({ status }: { status: PodDef['status'] }) {
  return <Chip tone={status === 'Active' ? 'ok' : status === 'Sandbox' ? 'warn' : 'deny'}>● {status}</Chip>;
}

export function PodsPage() {
  const { domain, state } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  // Lead with the two hero pods; everything else keeps its existing order.
  const HERO_FIRST = [SRP_ID, ITSP_ID];
  const heroRank = (id: string) => {
    const i = HERO_FIRST.indexOf(id);
    return i === -1 ? HERO_FIRST.length : i;
  };
  const pods = POD_LIST.filter(
    (p) => (domain === 'all' || p.domainId === domain) && (status === 'all' || p.status === status) && `${p.name} ${p.domain} ${p.summary}`.toLowerCase().includes(query.toLowerCase()),
  ).sort((a, b) => heroRank(a.id) - heroRank(b.id));
  return (
    <div>
      <PageHeader title="Pods" sub="Teams of agents, each serving one or more capabilities." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2">
          <Search className="h-4 w-4 text-[var(--ink-faint)]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pods" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[['all', 'Any status'], ['Active', 'Active'], ['Sandbox', 'Sandbox'], ['Suspended', 'Suspended']]} />
        <span className="ml-auto text-xs tabular-nums text-[var(--ink-faint)]">{pods.length} pods</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {pods.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => void navigate(`/pods/${p.id}`)}
            className={`rounded-xl border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${p.id === SRP_ID ? 'border-2 border-[var(--brand-line)]' : 'border-[var(--line)]'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-semibold">{p.name}</div>
                <div className="text-xs text-[var(--ink-faint)]">{p.domain}</div>
              </div>
              <StatusChip status={p.status} />
            </div>
            <PodThumb kits={kits(p)} muted={p.status !== 'Active'} />
            <div className="flex items-center justify-between text-xs text-[var(--ink-soft)]">
              <span>
                {podMemberCount(p)} agents · {p.id === SRP_ID ? state.liveVersion : p.version} · {p.autonomyTier.split(' · ')[0]}
              </span>
              <span className="tabular-nums">
                {p.runsThisMonth.toLocaleString()} runs · {money(p.cost30d)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PodDetailPage() {
  const { podId } = useParams();
  const { state, submitRequest } = useStore();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const pod = podById(podId ?? '');

  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  if (!pod)
    return (
      <Panel className="p-10 text-center text-sm text-[var(--ink-soft)]">
        Pod not found.{' '}
        <Link to="/pods" className="font-medium text-[var(--brand-strong)]">
          Back
        </Link>
      </Panel>
    );

  const flagship = pod.id === SRP_ID;
  const caps = CAPABILITIES.filter((c) => pod.capabilityIds.includes(c.id));
  const work = WORK_ITEMS.filter((w) => w.podId === pod.id).slice(0, 8);

  return (
    <div>
      <PageHeader
        title={pod.name}
        sub={`${pod.owner} · ${pod.domain}`}
        right={
          caps[0] && (
            <div className="flex gap-2">
              <SecondaryButton onClick={() => void navigate(`/ask?cap=${caps[0].id}`)}>
                <MessageSquare className="h-4 w-4" /> {isOperationalPod(pod.id) ? 'Trace one ticket' : 'Use in Ask'}
              </SecondaryButton>
              {isOperationalPod(pod.id) ? (
                <LiveOpsButton />
              ) : (
                <PrimaryButton
                  onClick={() => {
                    const rid = submitRequest(caps[0].sampleRequest, caps[0].id);
                    void navigate(`/work/${rid}`);
                  }}
                  disabled={pod.status !== 'Active'}
                >
                  <Play className="h-4 w-4" /> Run pod
                </PrimaryButton>
              )}
            </div>
          )
        }
      />
      <div className="-mt-3 mb-5 flex flex-wrap items-center gap-2">
        <StatusChip status={pod.status} />
        {isOperationalPod(pod.id) && <Chip tone="ok">● Running continuously</Chip>}
        <Chip tone="brand">{flagship ? state.liveVersion : pod.version} live</Chip>
        <Chip>{pod.autonomyTier}</Chip>
        <Chip>
          {podMemberCount(pod)} agents · {pod.agentIds.length} Northwind-built · {podPlatformAgents(pod).length} Databricks
        </Chip>
        <Chip>
          {pod.runsThisMonth.toLocaleString()} runs · {money(pod.cost30d)} · 30d
        </Chip>
      </div>

      <Panel className="mb-5 p-4">
        <SectionTitle>Serves</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {caps.map((c) => (
            <Link key={c.id} to={`/capabilities/${c.id}`} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm hover:border-[var(--brand-line)]">
              <span className="font-medium">{c.name}</span> <span className="text-xs text-[var(--ink-faint)]">· {c.runs30d.toLocaleString()} runs</span>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel className="mb-5 p-5">
        <PodFlow pod={pod} agents={agentsOf(pod)} onPick={(id) => setParams({ agent: id })} />
      </Panel>

      {gatesForPod(pod.id).length > 0 && (
        <Panel className="mb-5 p-5">
          <SectionTitle right={<Chip tone="warn"><ShieldCheck className="h-3 w-3" /> GxP</Chip>}>Accountability &amp; sign-off</SectionTitle>
          <PodAccountability gates={gatesForPod(pod.id)} />
        </Panel>
      )}

      {isOperationalPod(pod.id) && (
        <>
          <Panel className="mb-5 p-5">
            <SectionTitle right={<Chip tone="ok">● Continuous</Chip>}>Operating model</SectionTitle>
            <OperatingModel />
          </Panel>
          <Panel className="mb-5 p-5">
            <SectionTitle>Live operations</SectionTitle>
            <OpsConsole />
          </Panel>
        </>
      )}

      {flagship ? (
        <PodVersions />
      ) : (
        <Panel id="versions" className="mb-5 p-5">
          <SectionTitle>Versions</SectionTitle>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Chip tone="ok">{pod.version} live</Chip>
            <span className="text-[var(--ink-soft)]">Corrections from sign-off feed the next candidate. See Submission Dossier Pod for the full promote flow.</span>
          </div>
        </Panel>
      )}

      <Panel className="mb-5 p-5">
        <SectionTitle>Manifest</SectionTitle>
        <ManifestPanel bundle={podManifest(pod, caps)} />
      </Panel>

      <Panel className="p-5">
        <SectionTitle>Recent work</SectionTitle>
        {work.length === 0 ? (
          <div className="text-sm text-[var(--ink-faint)]">No recent items.</div>
        ) : (
          <div className="divide-y divide-[var(--line)]">
            {work.map((w) => (
              <div key={w.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-16 font-mono text-xs text-[var(--ink-faint)]">{w.id}</span>
                <span className="flex-1 truncate">{w.title}</span>
                <Chip>{w.kind}</Chip>
                <Chip tone={w.status === 'Done' ? 'ok' : w.status === 'Running' ? 'brand' : 'warn'}>{w.status}</Chip>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <AgentDrawer agentId={roleAgentById(params.get('agent') ?? '') ? params.get('agent') : null} onClose={() => setParams({})} />
      <SkillDrawer skill={!roleAgentById(params.get('agent') ?? '') ? (state.skills.find((x) => x.id === params.get('agent')) ?? null) : null} onClose={() => setParams({})} />
    </div>
  );
}

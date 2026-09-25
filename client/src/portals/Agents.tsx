import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@databricks/appkit-ui/react';
import { Code2 } from 'lucide-react';
import { useStore } from '../state/store';
import { ALL_AGENTS, domainById, podById, roleAgentById, type AgentRow, type BuiltBy, type RoleAgent } from '../data/estate';
import { AGENT_WIRING, WIRING_GAP } from '../data/liveWiring';
import { SRP_AGENTS } from '../data/pods';
import { Chip, PageHeader } from '../components/ui';
import { ManifestPanel } from '../components/Manifest';
import { personById } from '../data/access';
import { agentManifest } from '../data/manifest';
import { AgentCard } from './agents/AgentCard';
import { DataTable, FilterSelect, type Column } from '../components/DataTable';
import { cx } from '../lib/format';
import { KIT_COLOR } from '../viz/palette';
import { SkillDrawer } from './Skills';

export function KitDots({ a }: { a: RoleAgent }) {
  return (
    <span className="flex items-center gap-2 text-xs tabular-nums text-[var(--ink-soft)]">
      {(
        [
          ['skill', a.skills.length],
          ['tool', a.tools.length],
          ['agent', a.calls.length],
        ] as const
      ).map(([k, n]) => (
        <span key={k} className={cx('flex items-center gap-1', n === 0 && 'opacity-30')} title={`${n.toString()} ${k === 'agent' ? 'Databricks agent' : k}${n === 1 ? '' : 's'}`}>
          <span className="h-2 w-2 rounded-full" style={{ background: KIT_COLOR[k] }} />
          {n}
        </span>
      ))}
    </span>
  );
}

export function AgentDrawer({ agentId, onClose }: { agentId: string | null; onClose: () => void }) {
  const a = agentId ? roleAgentById(agentId) : undefined;
  const flagship = SRP_AGENTS.find((x) => x.id === agentId);
  const [tab, setTab] = useState<'Agent card' | 'Manifest'>('Agent card');
  const [personId, setPersonId] = useState('you');
  return (
    <Sheet open={a !== undefined} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto bg-white sm:max-w-xl">
        {a && (
          <>
            <SheetHeader className="pb-2">
              <SheetTitle className="sr-only">{a.name}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 px-4 pb-8">
              <div className="flex w-fit gap-1 rounded-xl bg-[#f3efeb] p-1">
                {(['Agent card', 'Manifest'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)} className={cx('rounded-lg px-3 py-1.5 text-sm font-medium', tab === t ? 'bg-white shadow-sm' : 'text-[var(--ink-soft)]')}>
                    {t}
                  </button>
                ))}
              </div>
              {tab === 'Agent card' ? <AgentCard agent={a} person={personById(personId)} onPerson={setPersonId} /> : <ManifestPanel bundle={agentManifest(a)} stacked />}
              {flagship && (
                <details className="rounded-xl bg-[#1f1d1b] p-4 text-[#f3e9e2]">
                  <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-white">
                    <Code2 className="h-4 w-4 text-[var(--brand)]" /> In the live build
                  </summary>
                  <ul className="mt-3 space-y-1.5 font-mono text-[11px] leading-relaxed">
                    {AGENT_WIRING[flagship.id].map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-[#cbbfb6]">{WIRING_GAP}</p>
                </details>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

const BUILT_TONE = { GSK: 'brand', Databricks: 'info', External: 'neutral' } as const;

export function AgentsPage() {
  const { domain, state } = useStore();
  const [params, setParams] = useSearchParams();
  const [built, setBuilt] = useState('all');
  const openId = params.get('open');
  const rows = ALL_AGENTS.filter((a) => (domain === 'all' || a.domainId === domain) && (built === 'all' || a.builtBy === built));
  const counts = (b: BuiltBy) => ALL_AGENTS.filter((a) => a.builtBy === b).length;

  const columns: Column<AgentRow>[] = [
    {
      key: 'name',
      header: 'Agent',
      sort: (a) => a.name,
      render: (a) => (
        <div>
          <div className="font-medium">{a.name}</div>
          <div className="text-xs text-[var(--ink-faint)]">{a.kind}</div>
        </div>
      ),
    },
    { key: 'built', header: 'Built by', sort: (a) => a.builtBy, render: (a) => <Chip tone={BUILT_TONE[a.builtBy]}>{a.builtBy}</Chip> },
    {
      key: 'pods',
      header: 'Pods',
      sort: (a) => a.podIds.length,
      render: (a) => (
        <span className="text-[var(--ink-soft)]">
          {a.podIds[0] ? podById(a.podIds[0])?.name : '—'}
          {a.podIds.length > 1 && <span className="text-xs text-[var(--ink-faint)]"> +{a.podIds.length - 1}</span>}
        </span>
      ),
    },
    { key: 'kit', header: 'Skills · tools', render: (a) => (a.role ? <KitDots a={a.role} /> : <span className="text-xs text-[var(--ink-faint)]">ready-made</span>), hideBelow: 'md' },
    { key: 'domain', header: 'Domain', sort: (a) => a.domainId, render: (a) => <span className="text-xs text-[var(--ink-soft)]">{a.domainId ? domainById(a.domainId).name : ''}</span>, hideBelow: 'lg' },
    { key: 'runs', header: 'Runs · 30d', align: 'right', sort: (a) => a.runs, render: (a) => <span className="tabular-nums">{a.runs.toLocaleString()}</span> },
  ];

  const close = () => {
    const next = Object.fromEntries(params);
    delete next.open;
    setParams(next);
  };

  return (
    <div>
      <PageHeader title="Agents" sub="One kind of agent. GSK-built agents get their know-how from skills; Databricks agents come ready-made." />
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(a) => a.id}
        onRow={(a) => setParams({ ...Object.fromEntries(params), open: a.id })}
        search={(a) => `${a.name} ${a.kind} ${a.builtBy} ${a.podIds.map((id) => podById(id)?.name ?? '').join(' ')}`}
        placeholder="Search agents or pods"
        initialSort={{ key: 'runs', dir: 'desc' }}
        toolbar={
          <FilterSelect
            label="Built by"
            value={built}
            onChange={setBuilt}
            options={[
              ['all', 'Built by anyone'],
              ['GSK', `GSK (${counts('GSK').toString()})`],
              ['Databricks', `Databricks (${counts('Databricks').toString()})`],
              ['External', `External (${counts('External').toString()})`],
            ]}
          />
        }
      />
      <AgentDrawer agentId={openId && roleAgentById(openId) ? openId : null} onClose={close} />
      <SkillDrawer skill={openId && !roleAgentById(openId) ? (state.skills.find((x) => x.id === openId) ?? null) : null} onClose={close} />
    </div>
  );
}

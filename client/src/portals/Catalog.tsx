import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useStore } from '../state/store';
import { DOMAINS, usage } from '../data/estate';
import { layerOf, type Skill } from '../data/types';
import { Chip, PageHeader, SkillStatusChip, SkillTypeLabel } from '../components/ui';
import { DataTable, FilterSelect, type Column } from '../components/DataTable';
import { SkillDrawer } from './Skills';

function CatalogPage({ layer, title, sub, embedded = false }: { layer: 'skill' | 'tool' | 'agent'; title: string; sub: string; embedded?: boolean }) {
  const { state, domain } = useStore();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState('all');
  const [runsOn, setRunsOn] = useState('all');
  const openId = params.get('open');
  const domainName = DOMAINS.find((d) => d.id === domain)?.name;

  const all = state.skills.filter((s) => layerOf(s.type) === layer);
  const places = [...new Set(all.map((s) => s.runsOn ?? '').filter(Boolean))].sort();
  const rows = all.filter((s) => (!domainName || s.domain === domainName) && (status === 'all' || s.status === status) && (runsOn === 'all' || s.runsOn === runsOn));

  const columns: Column<Skill>[] = [
    {
      key: 'name',
      header: 'Name',
      sort: (s) => s.name,
      render: (s) => (
        <div>
          <div className="font-medium">{s.name}</div>
          <div className="text-xs text-[var(--ink-faint)]">{s.domain}</div>
        </div>
      ),
    },
    ...(layer !== 'skill' ? [{ key: 'type', header: 'Type', render: (s: Skill) => <SkillTypeLabel type={s.type} />, sort: (s: Skill) => s.type, hideBelow: 'md' as const }] : []),
    ...(layer !== 'skill'
      ? [{ key: 'runsOn', header: 'Runs on', render: (s: Skill) => <Chip tone={s.runsOn === 'Databricks' ? 'neutral' : 'info'}>{s.runsOn ?? 'Databricks'}</Chip>, sort: (s: Skill) => s.runsOn ?? '', hideBelow: 'md' as const }]
      : []),
    { key: 'owner', header: 'Owner', render: (s) => <span className="text-[var(--ink-soft)]">{s.owner}</span>, sort: (s) => s.owner, hideBelow: 'lg' },
    {
      key: 'used',
      header: 'Used by',
      align: 'right',
      sort: (s) => usage(s.id).capabilities.length + usage(s.id).agents.length,
      render: (s) => {
        const u = usage(s.id);
        return (
          <span className="text-xs tabular-nums text-[var(--ink-soft)]">
            {u.capabilities.length} cap · {u.agents.length} agents
          </span>
        );
      },
    },
    { key: 'calls', header: 'Calls', align: 'right', sort: (s) => s.usageCount, render: (s) => <span className="tabular-nums">{s.usageCount.toLocaleString()}</span>, hideBelow: 'md' },
    { key: 'tier', header: 'GxP', render: (s) => <span className="text-xs text-[var(--ink-soft)]">{s.gxpTier}</span>, sort: (s) => s.gxpTier, hideBelow: 'lg' },
    { key: 'status', header: 'Status', align: 'right', sort: (s) => s.status, render: (s) => <SkillStatusChip status={s.status} /> },
  ];

  return (
    <div>
      {!embedded && <PageHeader title={title} sub={sub} />}
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(s) => s.id}
        onRow={(s) => setParams({ ...Object.fromEntries(params), open: s.id })}
        search={(s) => `${s.name} ${s.owner} ${s.domain} ${s.runsOn ?? ''}`}
        placeholder={`Search ${title.toLowerCase()}`}
        initialSort={{ key: 'calls', dir: 'desc' }}
        toolbar={
          <>
            <FilterSelect label="Status" value={status} onChange={setStatus} options={[['all', 'Any status'], ['Certified', 'Certified'], ['Under Review', 'Under review'], ['Sandbox', 'Sandbox']]} />
            {layer !== 'skill' && <FilterSelect label="Runs on" value={runsOn} onChange={setRunsOn} options={[['all', 'Runs anywhere'], ...places.map((p): [string, string] => [p, p])]} />}
          </>
        }
      />
      <SkillDrawer
        skill={state.skills.find((s) => s.id === openId) ?? null}
        onClose={() => {
          const next = Object.fromEntries(params);
          delete next.open;
          setParams(next);
        }}
      />
    </div>
  );
}

export function SkillsPage() {
  return <CatalogPage layer="skill" title="Skills" sub="Know-how, written as SKILL.md and governed in Unity Catalog." />;
}

export function ToolsPage() {
  return <CatalogPage layer="tool" title="Tools" sub="How skills act on Northwind systems: UC functions and MCP services." />;
}

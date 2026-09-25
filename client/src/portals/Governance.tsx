import { Link, useSearchParams } from 'react-router';
import { AlertTriangle, BadgeCheck } from 'lucide-react';
import { useStore } from '../state/store';
import { CAPABILITIES, DENIALS, DOMAINS, PLATFORM, POD_LIST, domainById, gxpHold, type Denial } from '../data/estate';
import type { Skill } from '../data/types';
import { Chip, PageHeader, Panel, PrimaryButton, SkillStatusChip, SkillTypeLabel } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { Bars, Kpi, MaturityBadge, SectionTitle } from '../components/bits';
import { cx, money } from '../lib/format';

const TABS: [string, string][] = [
  ['maturity', 'Maturity & GxP'],
  ['spend', 'Spend'],
  ['denials', 'Access denials'],
  ['certification', 'Certification'],
];

export function GovernancePage() {
  const { state, domain, certify, capabilities } = useStore();
  const capQueue = capabilities.filter((c) => c.inReview);
  const [params, setParams] = useSearchParams();
  const tab = TABS.find(([k]) => k === params.get('tab'))?.[0] ?? 'maturity';
  const caps = CAPABILITIES.filter((c) => domain === 'all' || c.domainId === domain);
  const gxpCaps = caps.filter((c) => c.gxp);
  const holds = gxpCaps.filter((c) => gxpHold(c).length > 0);
  const denials = DENIALS.filter((d) => domain === 'all' || d.domainId === domain);
  const spend = caps.reduce((s, c) => s + c.runs30d * c.costPerRun, 0);
  const domainName = DOMAINS.find((d) => d.id === domain)?.name;
  const queue = state.skills.filter((s) => (s.status === 'Under Review' || s.status === 'Sandbox') && (!domainName || s.domain === domainName));

  const byBu = new Map<string, number>();
  for (const c of caps) {
    const bu = domainById(c.domainId).bu;
    byBu.set(bu, (byBu.get(bu) ?? 0) + c.runs30d * c.costPerRun);
  }
  const pods = POD_LIST.filter((p) => domain === 'all' || p.domainId === domain)
    .sort((a, b) => b.cost30d - a.cost30d)
    .slice(0, 10);

  const denialCols: Column<Denial>[] = [
    { key: 'when', header: 'When', render: (d) => <span className="text-xs text-[var(--ink-soft)]">{d.when}</span> },
    {
      key: 'agent',
      header: 'Agent',
      sort: (d) => d.agent,
      render: (d) => (
        <div>
          <div className="font-medium">{d.agent}</div>
          <div className="text-xs text-[var(--ink-faint)]">{d.pod}</div>
        </div>
      ),
    },
    { key: 'resource', header: 'Tried to reach', sort: (d) => d.resource, render: (d) => <span className="font-mono text-xs">{d.resource}</span> },
    { key: 'reason', header: 'Reason', sort: (d) => d.reason, render: (d) => <Chip tone="deny">{d.reason}</Chip> },
  ];

  const certCols: Column<Skill>[] = [
    {
      key: 'name',
      header: 'Entry',
      sort: (s) => s.name,
      render: (s) => (
        <div>
          <div className="font-medium">{s.name}</div>
          <div className="text-xs text-[var(--ink-faint)]">
            {s.domain} · {s.owner}
          </div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (s) => <SkillTypeLabel type={s.type} />, sort: (s) => s.type, hideBelow: 'md' },
    { key: 'status', header: 'Status', render: (s) => <SkillStatusChip status={s.status} />, sort: (s) => s.status },
    {
      key: 'act',
      header: '',
      align: 'right',
      render: (s) =>
        s.status === 'Under Review' ? (
          <PrimaryButton
            className="px-3 py-1 text-xs"
            onClick={() => {
              certify(s.id);
            }}
          >
            <BadgeCheck className="h-3.5 w-3.5" /> Certify
          </PrimaryButton>
        ) : (
          <span className="text-xs text-[var(--ink-faint)]">needs evaluation first</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="Governance & cost" sub="What the workforce is built on, what it spends, and what it was stopped from doing." />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="GxP capabilities on Beta / Preview" value={`${holds.length.toString()} / ${gxpCaps.length.toString()}`} sub="non-GxP data only until GA" />
        <Kpi label="Spend · 30d" value={money(spend)} sub="AI Gateway attributed" />
        <Kpi label="Access denials · 30d" value={denials.length} sub="all logged to UC audit" />
        <Kpi label="Awaiting certification" value={queue.filter((s) => s.status === 'Under Review').length} sub={`${queue.filter((s) => s.status === 'Sandbox').length.toString()} more in sandbox`} />
      </div>

      <div className="mb-4 flex w-fit flex-wrap gap-1 rounded-xl bg-[#f3efeb] p-1">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setParams({ tab: k })} className={cx('rounded-lg px-3 py-1.5 text-sm font-medium', tab === k ? 'bg-white shadow-sm' : 'text-[var(--ink-soft)]')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'maturity' && (
        <div className="space-y-5">
          {holds.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--warn)] bg-[var(--warn-soft)] px-4 py-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-[var(--warn)]" />
              <span className="flex-1">
                <b>{holds.length} GxP capabilities</b> depend on at least one Beta or Preview feature. Keep them on non-GxP data until those reach GA (Code Orange policy, to confirm).
              </span>
              <Link to="/capabilities?filter=hold" className="font-medium text-[var(--brand-strong)] hover:underline">
                Show them →
              </Link>
            </div>
          )}
          <Panel className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--canvas)] text-xs text-[var(--ink-faint)]">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Building block</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="hidden px-4 py-2.5 text-left font-medium md:table-cell">What it does</th>
                  <th className="px-4 py-2.5 text-right font-medium">Capabilities using it</th>
                  <th className="px-4 py-2.5 text-right font-medium">GxP affected</th>
                </tr>
              </thead>
              <tbody>
                {PLATFORM.map((p) => {
                  const using = caps.filter((c) => c.deps.includes(p.id));
                  const gxp = using.filter((c) => c.gxp && p.status !== 'GA');
                  return (
                    <tr key={p.id} className="border-t border-[var(--line)]">
                      <td className="px-4 py-2.5 font-medium">{p.name}</td>
                      <td className="px-4 py-2.5">
                        <MaturityBadge status={p.status} />
                      </td>
                      <td className="hidden px-4 py-2.5 text-[var(--ink-soft)] md:table-cell">{p.note}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{using.length}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{gxp.length > 0 ? <span className="font-semibold text-[var(--warn)]">{gxp.length}</span> : <span className="text-[var(--ink-faint)]">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
          <p className="text-xs text-[var(--ink-faint)]">Statuses from Databricks docs and release notes as of Sep 2026. Verify before external use.</p>
        </div>
      )}

      {tab === 'spend' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel className="p-5">
            <SectionTitle>By business unit · 30d</SectionTitle>
            <Bars rows={[...byBu.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))} format={money} />
          </Panel>
          <Panel className="p-5">
            <SectionTitle>Top 10 pods · 30d</SectionTitle>
            <Bars rows={pods.map((p) => ({ label: p.name, value: p.cost30d, to: `/pods/${p.id}` }))} format={money} />
          </Panel>
        </div>
      )}

      {tab === 'denials' && <DataTable rows={denials} columns={denialCols} rowKey={(d) => d.id} search={(d) => `${d.agent} ${d.pod} ${d.resource} ${d.reason}`} placeholder="Search denials" />}

      {tab === 'certification' && (
        <div>
          <p className="mb-3 text-sm text-[var(--ink-soft)]">Only certified skills and tools can join Tier 1 and Tier 2 pods. Domain owners certify; Code Orange owns the rules.</p>
          {capQueue.length > 0 && (
            <Panel className="mb-4 divide-y divide-[var(--line)] overflow-hidden">
              <div className="bg-[var(--canvas)] px-4 py-2 text-xs font-semibold text-[var(--ink-faint)]">New capabilities submitted for certification</div>
              {capQueue.map((c) => (
                <Link key={c.id} to={`/capabilities/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--brand-soft)]/50">
                  <span className="flex-1 font-medium">{c.name}</span>
                  <span className="text-xs text-[var(--ink-faint)]">
                    {c.skills.length} skills · {c.tools.length} tools · {c.data.length} data · {c.domain}
                  </span>
                  <Chip tone="info">in certification</Chip>
                </Link>
              ))}
            </Panel>
          )}
          <DataTable rows={queue} columns={certCols} rowKey={(s) => s.id} search={(s) => `${s.name} ${s.domain} ${s.owner}`} placeholder="Search the queue" empty="Nothing waiting." />
        </div>
      )}
    </div>
  );
}

import { useNavigate, useSearchParams } from 'react-router';
import { CalendarClock, Link2, Zap } from 'lucide-react';
import { useStore } from '../state/store';
import { TRIGGERS, WORK_ITEMS, capabilityById, domainById, podById, type Trigger } from '../data/estate';
import type { WorkRequest } from '../data/types';
import { Chip, PageHeader } from '../components/ui';
import { DataTable, type Column } from '../components/DataTable';
import { cx, money } from '../lib/format';

type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'deny' | 'info';

export function statusLabel(r: WorkRequest): { text: string; tone: Tone } {
  switch (r.status) {
    case 'composing':
      return { text: 'Composing pod', tone: 'brand' };
    case 'pod_review':
      return { text: 'Pod needs review', tone: 'warn' };
    case 'in_progress':
      return { text: 'Running', tone: 'brand' };
    case 'pending_approval':
      return { text: 'Needs sign-off', tone: 'warn' };
    case 'changes_requested':
      return { text: 'Changes requested', tone: 'warn' };
    case 'completed':
      return { text: 'Done', tone: 'ok' };
    case 'rejected':
      return { text: 'Rejected / cancelled', tone: 'deny' };
  }
}

interface Row {
  id: string;
  kind: 'Request' | 'Human task' | 'Trigger run';
  title: string;
  podId: string;
  domainId: string;
  status: string;
  tone: Tone;
  owner: string;
  tier: string;
  due: string;
  blocks?: string;
  cost: number;
  live: boolean;
}

const TONE: Record<string, Tone> = { Running: 'brand', 'Needs sign-off': 'warn', 'Waiting on a person': 'warn', Open: 'info', Done: 'ok' };

export function WorkPortal() {
  const { state, domain } = useStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'all';

  const live: Row[] = state.requests.map((r) => {
    const s = statusLabel(r);
    const cap = capabilityById(r.capabilityId);
    return {
      id: r.id,
      kind: 'Request',
      title: r.title,
      podId: r.podId,
      domainId: cap?.domainId ?? '',
      status: s.text,
      tone: s.tone,
      owner: r.requester,
      tier: podById(r.podId)?.autonomyTier.split(' · ')[0] ?? '',
      due: r.createdAt,
      cost: r.cost,
      live: true,
    };
  });
  const generated: Row[] = WORK_ITEMS.map((w) => ({ ...w, tone: TONE[w.status] ?? 'neutral', live: false }));
  const all = [...live, ...generated].filter((r) => domain === 'all' || r.domainId === domain);
  const rows =
    tab === 'signoff' ? all.filter((r) => r.status === 'Needs sign-off') : tab === 'tasks' ? all.filter((r) => r.kind === 'Human task' && r.status !== 'Done') : tab === 'running' ? all.filter((r) => r.status === 'Running') : all;
  const count = (f: (r: Row) => boolean) => all.filter(f).length;

  const columns: Column<Row>[] = [
    { key: 'id', header: 'ID', sort: (r) => r.id, render: (r) => <span className="font-mono text-xs text-[var(--ink-faint)]">{r.id}</span>, width: '6rem' },
    {
      key: 'title',
      header: 'Item',
      sort: (r) => r.title,
      render: (r) => (
        <div>
          <div className="font-medium">{r.title}</div>
          <div className="flex items-center gap-1 text-xs text-[var(--ink-faint)]">
            {podById(r.podId)?.name ?? '—'} · {r.domainId ? domainById(r.domainId).name : ''}
            {r.blocks && (
              <span className="ml-1 inline-flex items-center gap-0.5 text-[var(--warn)]">
                <Link2 className="h-3 w-3" /> blocks {r.blocks}
              </span>
            )}
          </div>
        </div>
      ),
    },
    { key: 'kind', header: 'Type', sort: (r) => r.kind, render: (r) => <Chip tone={r.kind === 'Human task' ? 'info' : 'neutral'}>{r.kind}</Chip>, hideBelow: 'md' },
    { key: 'tier', header: 'Approval tier', sort: (r) => r.tier, render: (r) => <span className="text-xs text-[var(--ink-soft)]">{r.tier}</span>, hideBelow: 'lg' },
    { key: 'owner', header: 'Owner', sort: (r) => r.owner, render: (r) => <span className="text-[var(--ink-soft)]">{r.owner}</span>, hideBelow: 'lg' },
    { key: 'due', header: 'Due / when', render: (r) => <span className="text-xs text-[var(--ink-soft)]">{r.due}</span>, hideBelow: 'md' },
    { key: 'cost', header: 'Cost', align: 'right', sort: (r) => r.cost, render: (r) => <span className="tabular-nums text-[var(--ink-soft)]">{r.cost ? money(r.cost) : '—'}</span>, hideBelow: 'lg' },
    { key: 'status', header: 'Status', align: 'right', sort: (r) => r.status, render: (r) => <Chip tone={r.tone}>{r.status}</Chip> },
  ];

  const triggerCols: Column<Trigger>[] = [
    {
      key: 'when',
      header: 'When',
      sort: (t) => t.when,
      render: (t) => (
        <span className="flex items-center gap-2 font-medium">
          {t.kind === 'Event' ? <Zap className="h-4 w-4 text-[var(--brand)]" /> : <CalendarClock className="h-4 w-4 text-[var(--info)]" />}
          {t.when}
        </span>
      ),
    },
    { key: 'source', header: 'Source', sort: (t) => t.source, render: (t) => <Chip>{t.source}</Chip> },
    { key: 'cap', header: 'Starts capability', sort: (t) => capabilityById(t.capabilityId)?.name ?? '', render: (t) => capabilityById(t.capabilityId)?.name ?? t.capabilityId },
    { key: 'fires', header: 'Fired · 30d', align: 'right', sort: (t) => t.fires30d, render: (t) => <span className="tabular-nums">{t.fires30d}</span> },
    { key: 'last', header: 'Last fired', align: 'right', render: (t) => <span className="text-xs text-[var(--ink-soft)]">{t.lastFired}</span>, hideBelow: 'md' },
  ];

  const TABS: [string, string][] = [
    ['all', `All (${all.length.toString()})`],
    ['signoff', `Needs sign-off (${count((r) => r.status === 'Needs sign-off').toString()})`],
    ['tasks', `Human tasks (${count((r) => r.kind === 'Human task' && r.status !== 'Done').toString()})`],
    ['running', `Running (${count((r) => r.status === 'Running').toString()})`],
    ['triggers', `Triggers (${TRIGGERS.length.toString()})`],
  ];

  return (
    <div>
      <PageHeader title="Work" sub="One queue for people and pods: requests, sign-offs, human tasks and triggers." />
      <div className="mb-4 flex w-fit flex-wrap gap-1 rounded-xl bg-[#f3efeb] p-1">
        {TABS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => setParams(k === 'all' ? {} : { tab: k })} className={cx('rounded-lg px-3 py-1.5 text-sm font-medium', tab === k ? 'bg-white shadow-sm' : 'text-[var(--ink-soft)]')}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'triggers' ? (
        <DataTable rows={TRIGGERS.filter((t) => domain === 'all' || capabilityById(t.capabilityId)?.domainId === domain)} columns={triggerCols} rowKey={(t) => t.id} onRow={(t) => void navigate(`/capabilities/${t.capabilityId}`)} initialSort={{ key: 'fires', dir: 'desc' }} />
      ) : (
        <DataTable
          key={tab}
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          onRow={(r) => (r.live ? void navigate(`/work/${r.id}`) : undefined)}
          search={(r) => `${r.id} ${r.title} ${r.owner} ${podById(r.podId)?.name ?? ''}`}
          placeholder="Search work"
        />
      )}
      <p className="mt-3 text-xs text-[var(--ink-faint)]">Tier 1 = human-in-the-loop (approve each step) · Tier 2 = human-on-the-loop (approve the result) · Tier 3 = assistive.</p>
    </div>
  );
}

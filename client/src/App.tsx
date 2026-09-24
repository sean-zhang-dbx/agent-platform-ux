import { useEffect, useState } from 'react';
import { createBrowserRouter, Link, Navigate, NavLink, Outlet, RouterProvider, useLocation, useNavigate, useParams } from 'react-router';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@databricks/appkit-ui/react';
import { BookOpen, Bot, Boxes, ChevronRight, Layers, LayoutDashboard, ListChecks, MessageSquare, Presentation, RotateCcw, Search, ShieldCheck, Wrench } from 'lucide-react';
import { StoreProvider, useStore } from './state/store';
import { cx } from './lib/format';
import { ALL_AGENTS, CAPABILITIES, CATALOG, DOMAINS, ESTATE_COUNTS, POD_LIST, WORK_ITEMS, capabilityById, podById } from './data/estate';
import { layerOf } from './data/types';
import { HomePage } from './portals/Home';
import { ChatPortal } from './portals/Chat';
import { CapabilitiesPortal, CapabilityDetailPage } from './portals/Capabilities';
import { CapabilityComposer } from './portals/CapabilityComposer';
import { SkillsPage, ToolsPage } from './portals/Catalog';
import { AgentsPage } from './portals/Agents';
import { PodsPage, PodDetailPage } from './portals/Pods';
import { WorkPortal } from './portals/Work';
import { RequestPage } from './portals/work/RequestPage';
import { GovernancePage } from './portals/Governance';
import { PresenterBar } from './presenter/PresenterBar';

const NAV: { section?: string; items: { to: string; label: string; icon: typeof Layers; count?: number }[] }[] = [
  {
    items: [
      { to: '/', label: 'Home', icon: LayoutDashboard },
      { to: '/ask', label: 'Ask', icon: MessageSquare },
    ],
  },
  {
    section: 'Catalog',
    items: [
      { to: '/capabilities', label: 'Capabilities', icon: Layers, count: ESTATE_COUNTS.capabilities },
      { to: '/skills', label: 'Skills', icon: BookOpen, count: ESTATE_COUNTS.skills },
      { to: '/tools', label: 'Tools', icon: Wrench, count: ESTATE_COUNTS.tools },
      { to: '/agents', label: 'Agents', icon: Bot, count: ESTATE_COUNTS.agents },
      { to: '/pods', label: 'Pods', icon: Boxes, count: ESTATE_COUNTS.pods },
    ],
  },
  {
    section: 'Operations',
    items: [
      { to: '/work', label: 'Work', icon: ListChecks },
      { to: '/governance', label: 'Governance', icon: ShieldCheck },
    ],
  },
];

const SECTION_LABEL: Record<string, string> = { ask: 'Ask', capabilities: 'Capabilities', skills: 'Skills', tools: 'Tools', agents: 'Agents', pods: 'Pods', work: 'Work', governance: 'Governance' };

function Breadcrumbs() {
  const { pathname } = useLocation();
  const { state } = useStore();
  const [section, id] = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; to?: string }[] = [{ label: 'Agent Platform', to: '/' }];
  if (section) crumbs.push({ label: SECTION_LABEL[section] ?? section, to: `/${section}` });
  if (id) {
    const label = section === 'capabilities' ? (id === 'new' ? 'New capability' : (capabilityById(id)?.name ?? state.customCaps.find((c) => c.id === id)?.name)) : section === 'pods' ? podById(id)?.name : section === 'work' ? (state.requests.find((r) => r.id === id)?.title ?? id) : id;
    crumbs.push({ label: label ?? id });
  }
  return (
    <nav className="flex min-w-0 items-center gap-1 text-sm" aria-label="Breadcrumb">
      {crumbs.map((c, i) => (
        <span key={`${c.label}-${i.toString()}`} className="flex min-w-0 items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--ink-faint)]" />}
          {c.to && i < crumbs.length - 1 ? (
            <Link to={c.to} className="truncate text-[var(--ink-soft)] hover:text-[var(--ink)]">
              {c.label}
            </Link>
          ) : (
            <span className="truncate font-medium">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const go = (to: string) => {
    onOpenChange(false);
    void navigate(to);
  };
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search capabilities, pods, agents, skills, tools…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        <CommandGroup heading="Capabilities">
          {CAPABILITIES.map((c) => (
            <CommandItem key={c.id} value={`capability ${c.name} ${c.domain}`} onSelect={() => go(`/capabilities/${c.id}`)}>
              <Layers className="h-4 w-4" /> {c.name} <span className="ml-auto text-xs text-[var(--ink-faint)]">{c.domain}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Pods">
          {POD_LIST.map((p) => (
            <CommandItem key={p.id} value={`pod ${p.name} ${p.domain}`} onSelect={() => go(`/pods/${p.id}`)}>
              <Boxes className="h-4 w-4" /> {p.name} <span className="ml-auto text-xs text-[var(--ink-faint)]">{p.domain}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Agents">
          {ALL_AGENTS.map((a) => (
            <CommandItem key={a.id} value={`agent ${a.name} ${a.builtBy} ${a.kind}`} onSelect={() => go(`/agents?open=${a.id}`)}>
              <Bot className="h-4 w-4" /> {a.name} <span className="ml-auto text-xs text-[var(--ink-faint)]">{a.builtBy} · {a.kind}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Skills & tools">
          {CATALOG.filter((s) => layerOf(s.type) !== 'agent').map((s) => (
            <CommandItem key={s.id} value={`${s.type} ${s.name} ${s.domain}`} onSelect={() => go(layerOf(s.type) === 'skill' ? `/skills?open=${s.id}` : `/tools?open=${s.id}`)}>
              {layerOf(s.type) === 'skill' ? <BookOpen className="h-4 w-4" /> : layerOf(s.type) === 'tool' ? <Wrench className="h-4 w-4" /> : <Bot className="h-4 w-4" />} {s.name}
              <span className="ml-auto text-xs text-[var(--ink-faint)]">{s.type}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="pointer-events-none fixed left-1/2 top-16 z-50 flex -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="fade-up rounded-lg bg-[var(--ink)] px-4 py-2.5 text-sm text-white shadow-lg">
          {t.text}
        </div>
      ))}
    </div>
  );
}

function Sidebar() {
  const { state } = useStore();
  const signoff = state.requests.filter((r) => r.status === 'pending_approval').length + WORK_ITEMS.filter((w) => w.status === 'Needs sign-off').length;
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-[var(--line)] bg-white md:flex">
      <Link to="/" className="flex items-center gap-2.5 px-5 py-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--brand)] text-sm font-bold text-white">AP</div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Agent Platform</div>
          <div className="text-[11px] text-[var(--ink-faint)]">Digital workforce</div>
        </div>
      </Link>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4" aria-label="Main">
        {NAV.map((group, gi) => (
          <div key={group.section ?? `g${gi.toString()}`}>
            {group.section && <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-faint)]">{group.section}</div>}
            <div className="space-y-0.5">
              {group.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.to === '/'}
                  className={({ isActive }) =>
                    cx('flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition', isActive ? 'bg-[var(--brand-soft)] text-[var(--brand-strong)]' : 'text-[var(--ink-soft)] hover:bg-[#f3efeb] hover:text-[var(--ink)]')
                  }
                >
                  <it.icon className="h-4 w-4" />
                  <span className="flex-1">{it.label}</span>
                  {it.to === '/work' && signoff > 0 ? (
                    <span className="rounded-full bg-[var(--brand)] px-1.5 text-[10px] font-semibold text-white tabular-nums">{signoff}</span>
                  ) : it.count !== undefined ? (
                    <span className="text-[11px] tabular-nums text-[var(--ink-faint)]">{it.count}</span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-[var(--line)] px-5 py-3 text-[11px] text-[var(--ink-faint)]">
        <span className="rounded-full bg-[var(--warn-soft)] px-2 py-0.5 font-semibold text-[var(--warn)]">Prototype</span> synthetic data
      </div>
    </aside>
  );
}

function MobileNav() {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-[var(--line)] bg-white px-3 py-2 md:hidden" aria-label="Main">
      {NAV.flatMap((g) => g.items).map((it) => (
        <NavLink key={it.to} to={it.to} end={it.to === '/'} className={({ isActive }) => cx('shrink-0 rounded-lg px-2.5 py-1 text-sm', isActive ? 'bg-[var(--brand-soft)] text-[var(--brand-strong)]' : 'text-[var(--ink-soft)]')}>
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Layout() {
  const { reset, presenter, setPresenter, domain, setDomain } = useStore();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <Sidebar />
      <div className="md:pl-[232px]">
        <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-2.5 md:px-6">
            <Breadcrumbs />
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="hidden items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--canvas)] px-3 py-1.5 text-sm text-[var(--ink-faint)] hover:border-[var(--brand-line)] lg:flex"
              >
                <Search className="h-4 w-4" /> Search the estate
                <kbd className="rounded border border-[var(--line)] bg-white px-1.5 font-mono text-[10px]">⌘K</kbd>
              </button>
              <select value={domain} onChange={(e) => setDomain(e.target.value)} aria-label="Domain" className="rounded-lg border border-[var(--line)] bg-white px-2.5 py-1.5 text-sm">
                <option value="all">All domains</option>
                {DOMAINS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (presenter.on) setPresenter({ ...presenter, on: false });
                  else {
                    setPresenter({ on: true, step: 0, hold: false });
                    void navigate('/');
                  }
                }}
                className={cx('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition', presenter.on ? 'bg-[var(--ink)] text-white' : 'text-[var(--ink-soft)] hover:bg-[#f3efeb]')}
              >
                <Presentation className="h-3.5 w-3.5" /> Presenter
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  void navigate('/');
                }}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--ink-soft)] hover:bg-[#f3efeb]"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
          </div>
          <MobileNav />
        </header>
        <main className={cx('mx-auto max-w-[1400px] px-4 py-6 md:px-6', presenter.on && 'pb-72')}>
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <PresenterBar />
      <Toasts />
    </div>
  );
}

function LegacyPodRedirect() {
  const { podId } = useParams();
  return <Navigate to={`/pods/${podId ?? ''}`} replace />;
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/ask', element: <ChatPortal /> },
      { path: '/capabilities', element: <CapabilitiesPortal /> },
      { path: '/capabilities/new', element: <CapabilityComposer /> },
      { path: '/capabilities/:capId', element: <CapabilityDetailPage /> },
      { path: '/skills', element: <SkillsPage /> },
      { path: '/tools', element: <ToolsPage /> },
      { path: '/agents', element: <AgentsPage /> },
      { path: '/agents/:podId', element: <LegacyPodRedirect /> },
      { path: '/pods', element: <PodsPage /> },
      { path: '/pods/:podId', element: <PodDetailPage /> },
      { path: '/work', element: <WorkPortal /> },
      { path: '/work/:requestId', element: <RequestPage /> },
      { path: '/governance', element: <GovernancePage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return (
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  );
}

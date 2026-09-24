import type { ReactNode } from 'react';
import {
  BookOpen,
  CircleCheck,
  Ban,
  Hourglass,
  Library,
  LoaderCircle,
  Plug,
  RotateCw,
  Sparkles,
  SquareFunction,
  FlaskConical,
} from 'lucide-react';
import type { AgentStatus, SkillStatus, SkillType } from '../data/types';
import { cx } from '../lib/format';

export function Panel({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={cx('rounded-xl border border-[var(--line)] bg-white', className)}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--brand-strong)]">{children}</div>;
}

export function PageHeader({ title, sub, right }: { title: string; sub: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)] md:text-[28px]">{title}</h1>
        <p className="mt-1 text-[15px] text-[var(--ink-soft)]">{sub}</p>
      </div>
      {right}
    </div>
  );
}

export function Chip({ children, tone = 'neutral', className, title }: { children: ReactNode; tone?: 'neutral' | 'brand' | 'ok' | 'warn' | 'deny' | 'info'; className?: string; title?: string }) {
  const tones = {
    neutral: 'bg-[#f3efeb] text-[var(--ink-soft)] border-transparent',
    brand: 'bg-[var(--brand-soft)] text-[var(--brand-strong)] border-[var(--brand-line)]',
    ok: 'bg-[var(--ok-soft)] text-[var(--ok)] border-transparent',
    warn: 'bg-[var(--warn-soft)] text-[var(--warn)] border-transparent',
    deny: 'bg-[var(--deny-soft)] text-[var(--deny)] border-transparent',
    info: 'bg-[var(--info-soft)] text-[var(--info)] border-transparent',
  } as const;
  return (
    <span title={title} className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium', tones[tone], className)}>
      {children}
    </span>
  );
}

export function SkillStatusChip({ status }: { status: SkillStatus }) {
  if (status === 'Certified')
    return (
      <Chip tone="ok">
        <CircleCheck className="h-3 w-3" /> Certified
      </Chip>
    );
  if (status === 'Under Review')
    return (
      <Chip tone="warn">
        <Hourglass className="h-3 w-3" /> Under review
      </Chip>
    );
  return (
    <Chip tone="info">
      <FlaskConical className="h-3 w-3" /> Sandbox
    </Chip>
  );
}

const TYPE_ICON = {
  'UC Skill': BookOpen,
  'UC Function': SquareFunction,
  'MCP Service': Plug,
  'Genie Agent': Sparkles,
  'Knowledge Assistant': Library,
} as const;

export function SkillTypeLabel({ type }: { type: SkillType }) {
  const Icon = TYPE_ICON[type];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink-soft)]">
      <Icon className="h-3.5 w-3.5 text-[var(--brand)]" />
      {type}
    </span>
  );
}

export function AgentStatusChip({ status }: { status: AgentStatus }) {
  switch (status) {
    case 'waiting':
      return <Chip>Waiting</Chip>;
    case 'running':
      return (
        <Chip tone="brand">
          <LoaderCircle className="h-3 w-3 animate-spin" /> Running
        </Chip>
      );
    case 'retrying':
      return (
        <Chip tone="warn">
          <RotateCw className="h-3 w-3 animate-spin" /> Retrying
        </Chip>
      );
    case 'blocked':
      return (
        <Chip tone="deny">
          <Ban className="h-3 w-3" /> Blocked
        </Chip>
      );
    case 'complete':
      return (
        <Chip tone="ok">
          <CircleCheck className="h-3 w-3" /> Complete
        </Chip>
      );
  }
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-[var(--ink-faint)]">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-[var(--ink)]">{value}</div>
      {sub && <div className="text-xs text-[var(--ink-soft)]">{sub}</div>}
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled, type = 'button', className }: { children: ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit'; className?: string }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, disabled, className }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:border-[var(--brand-line)] hover:bg-[var(--brand-soft)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  );
}

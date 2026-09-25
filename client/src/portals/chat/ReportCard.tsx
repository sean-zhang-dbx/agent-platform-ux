import { Link } from 'react-router';
import { ArrowRight, CircleCheck, OctagonAlert, TriangleAlert } from 'lucide-react';
import { useStore } from '../../state/store';
import { capabilityById } from '../../data/estate';
import { reportFor } from '../../data/genericRun';
import { FLAGSHIP, SRA_ID } from '../../data/capabilities';
import { gatesForPod } from '../../data/pods';
import type { WorkRequest } from '../../data/types';
import { Chip, PrimaryButton, SecondaryButton } from '../../components/ui';
import { ApprovalsRegister } from '../../components/Approvals';
import { DossierButton } from '../../components/DossierPreview';
import { cx } from '../../lib/format';

export function ReportCard({ r }: { r: WorkRequest }) {
  const { decide } = useStore();
  const open = r.status === 'pending_approval';
  const rep = reportFor(capabilityById(r.capabilityId) ?? FLAGSHIP);
  const blocking = rep.flags.filter((f) => f.level === 'blocking');
  const others = rep.flags.filter((f) => f.level !== 'blocking');
  const gates = gatesForPod(r.podId);

  return (
    <div className={cx('rounded-2xl border bg-white p-4', open ? 'border-2 border-[var(--brand)] shadow-sm' : 'border-[var(--line)]')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Chip tone="ok" title={rep.checks.map((a) => `${a.name}: ${a.result}`).join('\n')}>
          <CircleCheck className="h-3 w-3" /> Acceptance checks {rep.checks.length}/{rep.checks.length} passed
        </Chip>
        <Link to={`/work/${r.id}`} className="flex items-center gap-1 text-sm font-medium text-[var(--brand-strong)] hover:underline">
          Full report <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-3 text-3xl font-bold tracking-tight text-[var(--warn)]">{rep.recommendation}</div>

      {r.capabilityId === SRA_ID && (
        <div className="mt-3">
          <DossierButton />
        </div>
      )}

      {blocking.map((f) => (
        <div key={f.text} className="mt-2 flex gap-2 rounded-lg bg-[var(--deny-soft)] px-3 py-2 text-sm font-medium">
          <OctagonAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--deny)]" /> {f.text}
        </div>
      ))}
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]">{others.length} more to check</summary>
        <ul className="mt-1.5 space-y-1">
          {others.map((f) => (
            <li key={f.text} className="flex gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn)]" /> {f.text}
            </li>
          ))}
        </ul>
      </details>

      {open &&
        (gates.length > 0 ? (
          <div className="mt-4">
            <ApprovalsRegister r={r} gates={gates} />
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <SecondaryButton onClick={() => decide(r.id, 'rejected', '')}>Reject</SecondaryButton>
            <SecondaryButton onClick={() => decide(r.id, 'changes_requested', '')}>Request changes</SecondaryButton>
            <PrimaryButton onClick={() => decide(r.id, 'approved', '')}>Approve &amp; sign</PrimaryButton>
          </div>
        ))}
    </div>
  );
}

import { useState } from 'react';
import { BadgeCheck, CircleCheck, Landmark, Lock, PenLine, ShieldCheck } from 'lucide-react';
import { useStore } from '../state/store';
import type { ApprovalGate } from '../data/pods';
import type { WorkRequest } from '../data/types';
import { Chip, PrimaryButton, SecondaryButton } from './ui';
import { cx } from '../lib/format';

function esig(): string {
  return Math.random().toString(16).slice(2, 6);
}

// Static, structural view: who is accountable for each part of the pod's output, and who signs it off.
export function PodAccountability({ gates }: { gates: ApprovalGate[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--ink-soft)]">
        Each agent is a governed extension of a responsible department, not of whoever triggers the pod. Delegating the
        work never removes that department&apos;s oversight — its contribution must be signed by the responsible person,
        and every signature is registered to the audit trail.
      </p>
      <div className="divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)]">
        {gates.map((g) => (
          <div key={g.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
              style={{ background: g.requesterCanSign ? 'var(--brand-soft)' : 'var(--warn-soft)' }}
            >
              {g.requesterCanSign ? (
                <PenLine className="h-4 w-4 text-[var(--brand-strong)]" />
              ) : (
                <Landmark className="h-4 w-4 text-[var(--warn)]" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{g.of}</div>
              <div className="text-xs text-[var(--ink-soft)]">
                Accountable: <b className="font-medium text-[var(--ink)]">{g.department}</b> · signed by {g.approverRole}
              </div>
            </div>
            <Chip tone={g.signature === 'Validated e-signature' ? 'info' : 'neutral'}>{g.signature}</Chip>
            {g.requesterCanSign ? (
              <Chip tone="brand">you sign</Chip>
            ) : (
              <Chip tone="warn">
                <Lock className="h-3 w-3" /> another department
              </Chip>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Interactive register shown at sign-off. The requester can sign only their own gate, and release is
// blocked until every responsible department has signed. Departmental sign-offs are simulated here
// (in the live build each is the responsible person's own Part 11 e-signature).
export function ApprovalsRegister({ r, gates }: { r: WorkRequest; gates: ApprovalGate[] }) {
  const { decide } = useStore();
  const [signed, setSigned] = useState<Record<string, { by: string; sig: string }>>({});
  const deptGates = gates.filter((g) => !g.requesterCanSign);
  const releaseGate = gates.find((g) => g.requesterCanSign);
  const allDeptSigned = deptGates.every((g) => signed[g.id]);

  const sign = (g: ApprovalGate) => setSigned((p) => ({ ...p, [g.id]: { by: g.approverRole, sig: esig() } }));

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--canvas)] p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-soft)]">
        <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand)]" /> Sign-offs required · registered to the audit trail
      </div>
      <div className="space-y-1.5">
        {gates.map((g) => {
          const done = signed[g.id];
          const isRelease = g.requesterCanSign;
          const blocked = isRelease && !allDeptSigned;
          return (
            <div
              key={g.id}
              className={cx(
                'flex flex-wrap items-center gap-x-2 gap-y-2 rounded-lg border bg-white px-3 py-2',
                done ? 'border-[var(--ok)]/40' : 'border-[var(--line)]',
              )}
            >
              {done ? (
                <CircleCheck className="h-4 w-4 shrink-0 text-[var(--ok)]" />
              ) : isRelease ? (
                <PenLine className="h-4 w-4 shrink-0 text-[var(--brand)]" />
              ) : (
                <Landmark className="h-4 w-4 shrink-0 text-[var(--warn)]" />
              )}
              <div className="min-w-[11rem] flex-1">
                <div className="text-sm font-medium">{g.of}</div>
                {done ? (
                  <div className="text-xs text-[var(--ok)]">
                    Signed · {done.by} · just now · e-sig ····{done.sig}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--ink-soft)]">
                    {isRelease ? 'Your release gate' : `Routed to ${g.department}`} · {g.approverRole}
                  </div>
                )}
              </div>
              {done ? (
                <Chip tone="ok" className="ml-auto shrink-0">
                  <BadgeCheck className="h-3 w-3" /> registered
                </Chip>
              ) : isRelease ? (
                <span className="ml-auto shrink-0">
                  <PrimaryButton disabled={blocked} onClick={() => decide(r.id, 'approved', '')}>
                    {blocked ? 'Blocked · awaiting sign-offs' : 'Sign & release dossier'}
                  </PrimaryButton>
                </span>
              ) : (
                <span className="ml-auto shrink-0">
                  <SecondaryButton onClick={() => sign(g)}>Register {g.department} sign-off</SecondaryButton>
                </span>
              )}
            </div>
          );
        })}
      </div>
      {releaseGate && !allDeptSigned && (
        <p className="mt-2 text-[11px] text-[var(--ink-faint)]">
          You triggered this pod, but you can&apos;t sign the clinical or labelling content — that oversight belongs to
          the responsible departments. Release unlocks once they sign.
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <SecondaryButton onClick={() => decide(r.id, 'rejected', '')}>Reject</SecondaryButton>
        <SecondaryButton onClick={() => decide(r.id, 'changes_requested', '')}>Request changes</SecondaryButton>
      </div>
    </div>
  );
}

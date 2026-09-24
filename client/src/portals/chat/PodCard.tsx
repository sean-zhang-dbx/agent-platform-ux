import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Check, Lock, MapPin, Pencil, Rocket, X } from 'lucide-react';
import { useStore } from '../../state/store';
import { SRA_ID } from '../../data/capabilities';
import { capabilityById, podById, podPlatformAgents, roleAgentById, type RoleAgent } from '../../data/estate';
import type { Skill, WorkRequest } from '../../data/types';
import { Chip, PrimaryButton, SecondaryButton } from '../../components/ui';
import { cx } from '../../lib/format';

// Extra capabilities the composer considered per role. Uncertified ones cannot join a Tier 2 pod.
const CANDIDATES: Record<string, string[]> = {
  clinical: [],
  regintel: ['rim-connector'],
  quality: ['lims-stability', 'sop-policy-library'],
  drafter: ['sop-policy-library'],
};

function agentsOf(r: WorkRequest): RoleAgent[] {
  return r.agentIds.map((id) => roleAgentById(id)).filter((a) => a !== undefined);
}

function platformOf(r: WorkRequest): Skill[] {
  const pod = podById(r.podId);
  return pod ? podPlatformAgents(pod) : [];
}

export function PodCard({ r }: { r: WorkRequest }) {
  const { state, approvePod, cancelRequest } = useStore();
  const [editing, setEditing] = useState(false);
  const reviewing = r.status === 'pod_review';
  const cancelled = r.status === 'rejected' && r.logs.length === 0;
  const byId = (id: string): Skill | undefined => state.skills.find((s) => s.id === id);
  const cap = capabilityById(r.capabilityId);
  const pod = podById(r.podId);
  const CONTEXT = cap?.context ?? [];
  const ONTOLOGY = cap?.ontology ?? [];
  const agents = agentsOf(r);
  const emptyRole = agents.find((a) => !(r.selectedSkills[a.id] ?? []).some((id) => byId(id)?.type === 'UC Skill'));
  const flagship = r.capabilityId === SRA_ID;

  return (
    <div className={cx('rounded-2xl border bg-white p-4', reviewing ? 'border-2 border-[var(--brand)] shadow-sm' : 'border-[var(--line)]')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-base font-semibold">
            {pod?.name} {flagship ? state.liveVersion : pod?.version}
          </div>
          <div className="text-xs text-[var(--ink-soft)]">
            {agents.length + platformOf(r).length} agents · {pod?.autonomyTier.split(' · ')[0]} · about ${(cap?.costPerRun ?? 0).toFixed(2)}
          </div>
        </div>
        {reviewing ? (
          <Chip tone="warn">Needs your approval</Chip>
        ) : cancelled ? (
          <Chip tone="deny">Cancelled</Chip>
        ) : (
          <Chip tone="ok">
            <Check className="h-3 w-3" /> Approved by you
          </Chip>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-[var(--brand)]" />
        {CONTEXT.map((c) => (
          <Chip key={c.key} title={c.key}>
            {c.value}
          </Chip>
        ))}
        <Chip tone="info" title={ONTOLOGY.map((o) => `${o.kind}: ${o.text}`).join('\n')}>
          + {ONTOLOGY.length} Genie Ontology snippets
        </Chip>
      </div>

      {reviewing ? (
        <PodRows r={r} editing={editing} />
      ) : (
        !cancelled && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]">Show pod</summary>
            <PodRows r={r} editing={false} />
          </details>
        )
      )}

      {reviewing && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {flagship && (
              <Chip tone="warn" title="LIMS Stability Data (Sandbox) and RIM Connector (Under review) were left out">
                <Lock className="h-3 w-3" /> 2 uncertified skipped
              </Chip>
            )}
            <Link to={`/pods/${r.podId}`} className="flex items-center gap-1 text-xs font-medium text-[var(--brand-strong)] hover:underline">
              Pod details <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => cancelRequest(r.id)}>
              <X className="h-4 w-4" /> Cancel
            </SecondaryButton>
            <SecondaryButton onClick={() => setEditing((e) => !e)}>
              <Pencil className="h-4 w-4" /> {editing ? 'Done' : 'Edit'}
            </SecondaryButton>
            <PrimaryButton disabled={emptyRole !== undefined} onClick={() => approvePod(r.id)}>
              <Rocket className="h-4 w-4" /> Approve &amp; run
            </PrimaryButton>
          </div>
        </div>
      )}
      {reviewing && emptyRole && <div className="mt-2 text-right text-xs font-medium text-[var(--deny)]">{emptyRole.name} needs at least one skill.</div>}
    </div>
  );
}

function PodRows({ r, editing }: { r: WorkRequest; editing: boolean }) {
  const { state, toggleSkill } = useStore();
  const byId = (id: string): Skill | undefined => state.skills.find((s) => s.id === id);

  return (
    <div className="mt-3 divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">
      {agentsOf(r).map((a) => {
        const selected = r.selectedSkills[a.id] ?? [];
        if (!editing) {
          const skill = selected.map(byId).find((s) => s?.type === 'UC Skill');
          const rest = selected.map(byId).filter((s): s is Skill => s !== undefined && s !== skill && s.type !== 'Genie Agent' && s.type !== 'Knowledge Assistant');
          return (
            <div key={a.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-sm font-medium">{a.name}</span>
              <span className="flex items-center gap-1.5">
                {skill && <Chip tone="brand">{skill.name}</Chip>}
                {rest.length > 0 && <Chip title={rest.map((s) => s.name).join(', ')}>+{rest.length}</Chip>}
              </span>
            </div>
          );
        }
        return (
          <div key={a.id} className="flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-center">
            <div className="w-44 shrink-0 text-sm font-medium">{a.name}</div>
            <div className="flex flex-wrap gap-1.5">
              {[...a.skills, ...a.tools, ...a.calls, ...(CANDIDATES[a.id] ?? [])].map((id) => {
                const s = byId(id);
                if (!s) return null;
                const certified = s.status === 'Certified';
                const on = selected.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!certified}
                    onClick={() => toggleSkill(r.id, a.id, id)}
                    title={certified ? `${s.type} · click to add or remove` : `${s.status}: not allowed in a Tier 2 pod`}
                    className={cx(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                      !certified && 'cursor-not-allowed border-dashed border-[#d9d2cb] text-[var(--ink-faint)]',
                      certified && on && 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-strong)]',
                      certified && !on && 'border-[var(--line)] text-[var(--ink-soft)] line-through',
                    )}
                  >
                    {!certified && <Lock className="h-3 w-3" />}
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {!editing &&
        platformOf(r).map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-sm font-medium">{s.name}</span>
            <Chip tone="info">Databricks · {s.type}</Chip>
          </div>
        ))}
    </div>
  );
}

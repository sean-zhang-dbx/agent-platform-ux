import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@databricks/appkit-ui/react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useStore } from '../state/store';
import { usage } from '../data/estate';
import { AUDIT_ACTORS } from '../data/skills';
import type { Skill } from '../data/types';
import { Chip, SecondaryButton, SkillStatusChip, SkillTypeLabel } from '../components/ui';

function usedBy(id: string): string[] {
  const u = usage(id);
  return [...u.capabilities.map((c) => c.name), ...u.agents.map((a) => a.name)].slice(0, 12);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function auditTrail(skill: Skill) {
  if (skill.usageCount === 0) return [];
  const seed = hash(skill.id);
  return Array.from({ length: 5 }, (_, i) => {
    const n = (seed >> i) + i * 7;
    return {
      when: i === 0 ? skill.lastUsed : `${(i * 11 + (n % 9)).toString()} min ago`,
      who: AUDIT_ACTORS[n % AUDIT_ACTORS.length],
      ok: n % 17 !== 0,
    };
  });
}

export function SkillDrawer({ skill, onClose }: { skill: Skill | null; onClose: () => void }) {
  const { toast } = useStore();
  const trail = skill ? auditTrail(skill) : [];
  const users = skill ? usedBy(skill.id) : [];
  return (
    <Sheet open={skill !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto bg-white sm:max-w-lg">
        {skill && (
          <>
            <SheetHeader className="border-b border-[var(--line)] pb-4">
              <div className="flex items-center gap-2">
                <SkillTypeLabel type={skill.type} />
                <SkillStatusChip status={skill.status} />
              </div>
              <SheetTitle className="text-xl">{skill.name}</SheetTitle>
              <code className="w-fit rounded bg-[#f3efeb] px-2 py-0.5 text-xs text-[var(--ink-soft)]">{skill.ucPath}</code>
            </SheetHeader>
            <div className="space-y-5 px-4 pb-8">
              <p className="text-sm leading-relaxed text-[var(--ink-soft)]">{skill.description}</p>
              <div className="text-sm text-[var(--ink-soft)]">
                <b className="text-[var(--ink)]">{skill.owner}</b> · {skill.domain} · GxP {skill.gxpTier} · {skill.version}
                {skill.runsOn && <> · runs on {skill.runsOn}</>}
              </div>
              <div className="space-y-1 rounded-lg border border-[var(--line)] p-3 font-mono text-xs">
                <div>
                  <span className="text-[var(--ink-faint)]">in&nbsp;&nbsp;</span> {skill.inputs}
                </div>
                <div>
                  <span className="text-[var(--ink-faint)]">out&nbsp;</span> {skill.outputs}
                </div>
              </div>
              <section>
                <h3 className="mb-2 text-sm font-semibold">Used by ({usage(skill.id).capabilities.length} capabilities · {usage(skill.id).agents.length} agents)</h3>
                <div className="flex flex-wrap gap-1.5">
                  {users.length === 0 ? (
                    <span className="text-sm text-[var(--ink-faint)]">No agents. Not certified for production pods.</span>
                  ) : (
                    users.map((a) => (
                      <Chip key={a} tone="brand">
                        {a}
                      </Chip>
                    ))
                  )}
                </div>
              </section>
              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  Recent calls <ShieldCheck className="h-3.5 w-3.5 text-[var(--ok)]" />
                </h3>
                {trail.length === 0 ? (
                  <div className="text-sm text-[var(--ink-faint)]">No calls yet.</div>
                ) : (
                  <ul className="divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] text-xs">
                    {trail.map((row) => (
                      <li key={`${row.when}-${row.who}`} className="flex items-center justify-between gap-2 px-3 py-1.5">
                        <span className="font-mono">{row.who}</span>
                        <span className="flex items-center gap-2 text-[var(--ink-faint)]">
                          {row.when} {row.ok ? <Chip tone="ok">OK</Chip> : <Chip tone="deny">Denied</Chip>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <SecondaryButton onClick={() => toast(`Access request sent to ${skill.owner}`)}>
                <KeyRound className="h-4 w-4" /> Request access
              </SecondaryButton>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

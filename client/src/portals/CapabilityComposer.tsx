import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { BadgeCheck, Check, ChevronLeft, ChevronRight, CircleAlert, MapPin, Plus, RotateCcw, Search, Send, Save, Wand2, X } from 'lucide-react';
import { useStore } from '../state/store';
import type { Capability, OntologySnippet } from '../data/capabilities';
import { CAPABILITIES, DATA_ASSETS, DOMAINS, domainById, slug } from '../data/estate';
import { layerOf, type Skill } from '../data/types';
import { Chip, PageHeader, Panel, PrimaryButton, SecondaryButton, SkillStatusChip } from '../components/ui';
import { cx } from '../lib/format';
import { LinkMap } from '../viz/LinkMap';
import { KIT_COLOR } from '../viz/palette';
import { YamlView } from '../components/Manifest';
import { capabilityManifest, parseCapabilityYaml } from '../data/manifest';

const STEPS = [
  { key: 'skills', label: 'Skills', hint: 'How the work is done', color: KIT_COLOR.skill },
  { key: 'tools', label: 'Tools', hint: 'How it acts on Northwind systems', color: KIT_COLOR.tool },
  { key: 'data', label: 'Data', hint: 'The evidence it relies on', color: KIT_COLOR.data },
  { key: 'context', label: 'Context', hint: 'The situation, plus what Northwind means by its words', color: 'var(--brand)' },
] as const;
type StepKey = (typeof STEPS)[number]['key'];

function PickRow({ on, onToggle, title, sub, right, disabled }: { on: boolean; onToggle: () => void; title: string; sub: string; right?: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cx('flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition', on ? 'border-[var(--brand)] bg-[var(--brand-soft)]' : 'border-[var(--line)] bg-white hover:border-[var(--brand-line)]', disabled && 'opacity-40')}
    >
      <span className={cx('grid h-4 w-4 shrink-0 place-items-center rounded border', on ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : 'border-[#cfc7c0]')}>{on && <Check className="h-3 w-3" />}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-[var(--ink-faint)]">{sub}</span>
      </span>
      {right}
    </button>
  );
}

export function CapabilityComposer() {
  const { state, saveCapability } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<StepKey>('skills');
  const [name, setName] = useState('');
  const [domainId, setDomainId] = useState('quality');
  const [allDomains, setAllDomains] = useState(false);
  const [query, setQuery] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [toolFor, setToolFor] = useState<Record<string, string>>({}); // tool id -> skill id ('' = unassigned)
  const [dataVia, setDataVia] = useState<Record<string, string>>({}); // data id -> skill or tool id
  const domain = domainById(domainId);
  const [fields, setFields] = useState<string[]>(domain.context);
  const [newField, setNewField] = useState('');
  const [snippets, setSnippets] = useState<string[]>([]);
  const [view, setView] = useState<'Map' | 'YAML'>('Map');
  const [yamlEdit, setYamlEdit] = useState<string | null>(null);
  const [yamlErrors, setYamlErrors] = useState<string[]>([]);

  const tools = Object.keys(toolFor);
  const data = Object.keys(dataVia);
  const byId = (id: string) => state.skills.find((s) => s.id === id);
  const inScope = (s: { domain: string }) => allDomains || s.domain === domain.name;
  const q = query.toLowerCase();

  const snippetPool: OntologySnippet[] = useMemo(() => {
    const seen = new Set<string>();
    return CAPABILITIES.filter((c) => c.domainId === domainId)
      .flatMap((c) => c.ontology)
      .filter((o) => (seen.has(o.text) ? false : (seen.add(o.text), true)))
      .slice(0, 8);
  }, [domainId]);

  const draft: Capability = useMemo(() => {
    const toolIds = Object.keys(toolFor);
    const dataIds = Object.keys(dataVia);
    const links: [string, string][] = [];
    for (const t of toolIds) if (toolFor[t]) links.push([toolFor[t], t]);
    for (const d of dataIds) if (dataVia[d]) links.push([dataVia[d], d]);
    const hasMcp = toolIds.some((t) => state.skills.find((s) => s.id === t)?.type === 'MCP Service');
    return {
      id: `${slug(name || 'untitled')}-draft`,
      name: name || 'Untitled capability',
      domain: domain.name,
      domainId,
      owner: domain.owners[0],
      status: 'Draft',
      gxp: domain.gxp,
      deps: ['uc-skills', 'uc-functions', 'genie-ontology', 'appkit-agents', 'ai-gateway', 'mlflow-tracing', ...(hasMcp ? ['mcp-services'] : [])],
      version: 'v0.1',
      hasCandidate: false,
      runs30d: 0,
      successRate: 0,
      costPerRun: 0,
      reviewerMin: 0,
      trend: Array.from({ length: 30 }, () => 0),
      sampleRequest: `${name || 'New capability'}. Flag anything that needs my attention.`,
      skills,
      tools: toolIds,
      links,
      data: dataIds.map((id) => {
        const a = DATA_ASSETS.find((x) => x.id === id);
        return { id, name: a?.name ?? id, ref: a?.ref ?? '', via: '', readBy: [] };
      }),
      context: fields.map((k) => ({ key: k, value: 'set per request' })),
      ontology: snippetPool.filter((o) => snippets.includes(o.text)),
      controls: [],
      checks: [],
    };
  }, [name, domain, domainId, skills, toolFor, dataVia, fields, snippets, snippetPool, state.skills]);

  const yaml = yamlEdit ?? capabilityManifest(draft, state.skills).files[0].text;
  const applyYaml = () => {
    const p = parseCapabilityYaml(yaml, state.skills);
    setYamlErrors(p.errors);
    if (p.errors.length > 0) return;
    if (p.title) setName(p.title);
    if (p.domainId) setDomainId(p.domainId);
    setSkills(p.skills);
    setToolFor(p.toolFor);
    setDataVia(p.dataVia);
    if (p.fields) setFields(p.fields);
    setYamlEdit(null);
  };

  const done: Record<StepKey, boolean> = { skills: skills.length > 0, tools: tools.length > 0, data: data.length > 0, context: fields.length > 0 };
  const readiness = Object.values(done).filter(Boolean).length;
  const uncertified = [...skills, ...tools].map(byId).filter((s): s is Skill => s !== undefined && s.status !== 'Certified');
  const unlinked = tools.filter((t) => !toolFor[t]).length + data.filter((d) => !dataVia[d]).length;
  const idx = STEPS.findIndex((s) => s.key === step);
  const canSave = name.trim().length > 2 && skills.length > 0;

  const toggle = <T,>(xs: T[], v: T): T[] => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]);

  const list = (layer: 'skill' | 'tool') =>
    state.skills
      .filter((s) => layerOf(s.type) === layer && inScope(s) && (q === '' || `${s.name} ${s.owner}`.toLowerCase().includes(q)))
      .sort((a, b) => Number(b.status === 'Certified') - Number(a.status === 'Certified') || b.usageCount - a.usageCount)
      .slice(0, 40);

  const save = (submit: boolean) => {
    saveCapability(draft, submit);
    void navigate(`/capabilities/${draft.id}`);
  };

  return (
    <div>
      <PageHeader
        title="New capability"
        sub="Put together skills, tools, data and context from the governed catalog."
        right={
          <div className="flex gap-2">
            <SecondaryButton disabled={!canSave} onClick={() => save(false)}>
              <Save className="h-4 w-4" /> Save draft
            </SecondaryButton>
            <PrimaryButton disabled={!canSave || readiness < 4} onClick={() => save(true)}>
              <Send className="h-4 w-4" /> Submit for certification
            </PrimaryButton>
          </div>
        }
      />

      <Panel className="mb-5 grid gap-3 p-4 md:grid-cols-[1fr_16rem]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name it as an outcome, e.g. “Assess batch release readiness”"
          className="rounded-lg border border-[var(--line)] px-3 py-2 text-[15px] outline-none focus:border-[var(--brand)]"
        />
        <select
          value={domainId}
          onChange={(e) => {
            setDomainId(e.target.value);
            setFields(domainById(e.target.value).context);
            setSnippets([]);
          }}
          aria-label="Domain"
          className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
        >
          {DOMAINS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="min-w-0">
          <div className="mb-4 grid grid-cols-4 gap-1 rounded-xl bg-[#f3efeb] p-1">
            {STEPS.map((s, i) => (
              <button key={s.key} type="button" onClick={() => setStep(s.key)} className={cx('flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium', step === s.key ? 'bg-white shadow-sm' : 'text-[var(--ink-soft)]')}>
                {done[s.key] ? <Check className="h-3.5 w-3.5 text-[var(--ok)]" /> : <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />}
                {i + 1}. {s.label}
              </button>
            ))}
          </div>

          <Panel className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold">{STEPS[idx].label}</div>
                <div className="text-xs text-[var(--ink-faint)]">{STEPS[idx].hint}</div>
              </div>
              {(step === 'skills' || step === 'tools') && (
                <label className="flex items-center gap-1.5 text-xs text-[var(--ink-soft)]">
                  <input type="checkbox" checked={allDomains} onChange={(e) => setAllDomains(e.target.checked)} /> Reuse from other domains
                </label>
              )}
            </div>

            {(step === 'skills' || step === 'tools') && (
              <label className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2">
                <Search className="h-4 w-4 text-[var(--ink-faint)]" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${step}`} className="w-full bg-transparent text-sm outline-none" />
              </label>
            )}

            <div className="max-h-[440px] space-y-1.5 overflow-y-auto pr-1">
              {step === 'skills' &&
                list('skill').map((s) => (
                  <PickRow key={s.id} on={skills.includes(s.id)} onToggle={() => setSkills(toggle(skills, s.id))} title={s.name} sub={`${s.domain} · ${s.owner}`} right={<SkillStatusChip status={s.status} />} />
                ))}

              {step === 'tools' &&
                list('tool').map((s) => {
                  const on = tools.includes(s.id);
                  return (
                    <div key={s.id} className="space-y-1">
                      <PickRow
                        on={on}
                        onToggle={() =>
                          setToolFor((m) => {
                            const next = { ...m };
                            if (on) delete next[s.id];
                            else next[s.id] = skills[0] ?? '';
                            return next;
                          })
                        }
                        title={s.name}
                        sub={`${s.type} · runs on ${s.runsOn ?? 'Databricks'}`}
                        right={<SkillStatusChip status={s.status} />}
                      />
                      {on && (
                        <div className="ml-7 flex items-center gap-2 text-xs text-[var(--ink-soft)]">
                          used by
                          <select value={toolFor[s.id]} onChange={(e) => setToolFor((m) => ({ ...m, [s.id]: e.target.value }))} className="rounded border border-[var(--line)] bg-white px-2 py-0.5">
                            <option value="">— pick a skill —</option>
                            {skills.map((id) => (
                              <option key={id} value={id}>
                                {byId(id)?.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}

              {step === 'data' &&
                DATA_ASSETS.filter((d) => allDomains || d.domainId === domainId).map((d) => {
                  const on = data.includes(d.id);
                  return (
                    <div key={d.id} className="space-y-1">
                      <PickRow
                        on={on}
                        onToggle={() =>
                          setDataVia((m) => {
                            const next = { ...m };
                            if (on) delete next[d.id];
                            else next[d.id] = tools[0] ?? skills[0] ?? '';
                            return next;
                          })
                        }
                        title={d.name}
                        sub={`${d.ref} · shared UC asset, referenced not copied`}
                      />
                      {on && (
                        <div className="ml-7 flex items-center gap-2 text-xs text-[var(--ink-soft)]">
                          read via
                          <select value={dataVia[d.id]} onChange={(e) => setDataVia((m) => ({ ...m, [d.id]: e.target.value }))} className="rounded border border-[var(--line)] bg-white px-2 py-0.5">
                            <option value="">— pick a tool or skill —</option>
                            {[...tools, ...skills].map((id) => (
                              <option key={id} value={id}>
                                {byId(id)?.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              {step === 'data' && (
                <label className="flex items-center gap-1.5 pt-1 text-xs text-[var(--ink-soft)]">
                  <input type="checkbox" checked={allDomains} onChange={(e) => setAllDomains(e.target.checked)} /> Show data from other domains
                </label>
              )}

              {step === 'context' && (
                <div className="space-y-4">
                  <div>
                    <div className="mb-1.5 text-xs font-semibold text-[var(--ink-soft)]">Filled in from each request</div>
                    <div className="flex flex-wrap gap-1.5">
                      {fields.map((f) => (
                        <span key={f} className="inline-flex items-center gap-1 rounded-full border border-[var(--brand-line)] bg-[var(--brand-soft)] px-2.5 py-0.5 text-xs font-medium">
                          {f}
                          <button type="button" aria-label={`Remove ${f}`} onClick={() => setFields(fields.filter((x) => x !== f))}>
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (newField.trim() && !fields.includes(newField.trim())) setFields([...fields, newField.trim()]);
                          setNewField('');
                        }}
                        className="inline-flex items-center gap-1"
                      >
                        <input value={newField} onChange={(e) => setNewField(e.target.value)} placeholder="Add field" className="w-28 rounded-full border border-[var(--line)] px-2.5 py-0.5 text-xs outline-none" />
                        <button type="submit" aria-label="Add field" className="rounded-full border border-[var(--line)] p-0.5">
                          <Plus className="h-3 w-3" />
                        </button>
                      </form>
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-[var(--ink-soft)]">
                      From Genie Ontology <Chip tone="info">Public Preview</Chip>
                    </div>
                    <div className="space-y-1.5">
                      {snippetPool.map((o) => (
                        <PickRow
                          key={o.text}
                          on={snippets.includes(o.text)}
                          onToggle={() => setSnippets(toggle(snippets, o.text))}
                          title={o.text}
                          sub={`${o.kind} · ${o.source} · authority ${o.authority.toFixed(2)}`}
                          right={o.origin === 'Curated' ? <BadgeCheck className="h-4 w-4 shrink-0 text-[var(--ok)]" /> : undefined}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
              <SecondaryButton disabled={idx === 0} onClick={() => setStep(STEPS[idx - 1].key)}>
                <ChevronLeft className="h-4 w-4" /> Back
              </SecondaryButton>
              {idx < STEPS.length - 1 ? (
                <PrimaryButton onClick={() => setStep(STEPS[idx + 1].key)}>
                  Next: {STEPS[idx + 1].label} <ChevronRight className="h-4 w-4" />
                </PrimaryButton>
              ) : (
                <PrimaryButton disabled={!canSave || readiness < 4} onClick={() => save(true)}>
                  <Send className="h-4 w-4" /> Submit for certification
                </PrimaryButton>
              )}
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Panel className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 font-semibold">{draft.name}</div>
              <div className="flex items-center gap-2">
                <Chip tone={readiness === 4 ? 'ok' : 'warn'}>{readiness} of 4 ingredients</Chip>
                <div className="flex gap-0.5 rounded-lg bg-[#f3efeb] p-0.5">
                  {(['Map', 'YAML'] as const).map((v) => (
                    <button key={v} type="button" onClick={() => setView(v)} className={cx('rounded-md px-2.5 py-1 text-xs font-medium', view === v ? 'bg-white shadow-sm' : 'text-[var(--ink-soft)]')}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {view === 'Map' ? (
              skills.length + tools.length + data.length === 0 ? (
                <div className="grid h-48 place-items-center rounded-lg border border-dashed border-[var(--line)] text-sm text-[var(--ink-faint)]">Pick skills, tools and data. The map builds here.</div>
              ) : (
                <LinkMap capability={draft} />
              )
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ink-soft)]">
                  <span>{yamlEdit === null ? 'Written from the form as you pick. Edit it to change the form.' : 'Edited by hand. Apply to update the form and the map.'}</span>
                  <div className="flex gap-1.5">
                    {yamlEdit !== null && (
                      <SecondaryButton onClick={() => { setYamlEdit(null); setYamlErrors([]); }}>
                        <RotateCcw className="h-3.5 w-3.5" /> Discard
                      </SecondaryButton>
                    )}
                    <PrimaryButton disabled={yamlEdit === null} onClick={applyYaml}>
                      <Wand2 className="h-3.5 w-3.5" /> Apply to form
                    </PrimaryButton>
                  </div>
                </div>
                <div className="relative overflow-hidden rounded-xl border border-[#2e2a27]">
                  <div className="bg-[#2a2623] px-3 py-1.5 font-mono text-[11px] text-[#cbbfb6]">gsk-agents/{domainId}/capabilities/{slug(name || 'untitled')}.yaml</div>
                  {yamlEdit === null ? (
                    <button type="button" onClick={() => setYamlEdit(yaml)} className="block w-full text-left" title="Click to edit">
                      <YamlView text={yaml} className="max-h-[440px]" />
                    </button>
                  ) : (
                    <textarea
                      value={yamlEdit}
                      onChange={(e) => setYamlEdit(e.target.value)}
                      spellCheck={false}
                      wrap="off"
                      aria-label="Capability manifest YAML"
                      className="block h-[440px] w-full resize-none bg-[#1f1d1b] px-4 py-3 font-mono text-[12px] leading-5 text-[#ece4dc] outline-none [font-variant-ligatures:none]"
                    />
                  )}
                </div>
                {yamlErrors.length > 0 && (
                  <ul className="space-y-1 rounded-lg bg-[var(--deny-soft)] p-3 text-xs text-[var(--deny)]">
                    {yamlErrors.map((e) => (
                      <li key={e} className="flex items-start gap-1.5">
                        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {e}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Panel>
          <Panel className="flex flex-wrap items-center gap-2 p-4 text-sm">
            <MapPin className="h-4 w-4 text-[var(--brand)]" />
            <b>Context</b>
            {fields.map((f) => (
              <Chip key={f}>{f}</Chip>
            ))}
            <Chip tone="info">+ {snippets.length} Genie Ontology snippets</Chip>
          </Panel>
          {(uncertified.length > 0 || unlinked > 0) && (
            <Panel className="space-y-1 bg-[var(--warn-soft)] p-3 text-xs">
              {unlinked > 0 && <div>{unlinked} item(s) not linked yet: say which skill uses each tool, and how each data source is read.</div>}
              {uncertified.length > 0 && <div>{uncertified.length} uncertified item(s): {uncertified.map((s) => s.name).join(', ')}. They need certification before the capability can run in a Tier 1 or Tier 2 pod.</div>}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

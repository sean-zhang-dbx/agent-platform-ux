// Who an agent acts for, and what it can reach for that person.
// Effective access = what the agent is granted ∩ what the person can see. Display only; nothing is enforced here.
import { CAPABILITIES, CATALOG, DATA_ASSETS, DENIALS, DOMAINS, TRIGGERS, domainById, podById, slug, type RoleAgent } from './estate';
import { SRP_AGENTS } from './pods';
import type { Skill } from './types';

export function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// ── People an agent can act for ────────────────────────────────────────────────
export interface Person {
  id: string;
  name: string;
  role: string;
  domains: string[]; // domains whose data the person is granted
  lacks: string[]; // UC refs (substring match) the person is not granted
  readOnly?: boolean;
}

export const YOU_ROLE = 'RA Lead · Vaccines';

export const PEOPLE: Person[] = [
  { id: 'you', name: 'You', role: YOU_ROLE, domains: ['rd-reg', 'rd-clin', 'quality'], lacks: ['patient_summary'] },
  { id: 'sean', name: 'Sean', role: 'R&D researcher', domains: ['rd-clin', 'rd-reg'], lacks: ['patient_summary', 'adverse_events', 'ha_letters'], readOnly: true },
  { id: 'priya', name: 'Priya', role: 'Quality lead · Ware', domains: ['quality', 'mfg', 'supply'], lacks: [] },
  { id: 'alex', name: 'Alex', role: 'CRO contractor (external)', domains: ['rd-clin'], lacks: ['adverse_events', 'patient_summary', 'protocols', 'site_enrollment'], readOnly: true },
];

export const personById = (id: string): Person => PEOPLE.find((p) => p.id === id) ?? PEOPLE[0];

// Map a request's requester string to a person. Unknown requesters get their own domain only.
export function personFor(requester: string, domainId: string): Person {
  if (requester.startsWith(YOU_ROLE)) return PEOPLE[0];
  const known = PEOPLE.find((p) => requester.startsWith(p.role));
  if (known) return known;
  return { id: slug(requester), name: requester, role: 'Requester', domains: [domainId], lacks: [] };
}

export const isYou = (p: Person) => p.id === 'you';
export const possessive = (p: Person) => (isYou(p) ? 'Your' : `${p.name}’s`);

// ── What an agent can reach ────────────────────────────────────────────────────
export type Group = 'system' | 'function' | 'table';
export interface AccessItem {
  key: string;
  label: string;
  ref: string;
  group: Group;
  via: string;
  access: 'read' | 'write';
  domainId: string;
  through?: string; // e.g. the Genie Agent that reads it
}

const domainIdOf = (s: Skill) => DOMAINS.find((d) => d.name === s.domain)?.id ?? 'enterprise';
export const isWrite = (id: string) => /save|submit|update|create|close|write|post/.test(id);
const cleanRef = (ref: string) => ref.replace(/\s*\(.*?\)/g, '').split(',')[0].trim();

// Hand-set tables for the flagship pod so the story reads right.
const FLAGSHIP_TABLES: Record<string, [string, string, string][]> = {
  clinical: [
    ['Clinical trials', 'demo.pharma.clinical_trials', 'get_clinical_summary'],
    ['Trial endpoints', 'demo.pharma.trial_endpoints', 'Clinical Trials Genie'],
    ['Patient summaries', 'demo.pharma.patient_summary', 'Clinical Trials Genie'],
    ['Adverse events', 'rd_clinical.safety.adverse_events', 'Clinical Trials Genie'],
  ],
  regintel: [
    ['Regulatory documents (18 PDFs)', 'demo.pharma.regulatory_docs', 'Regulatory Corpus (KA)'],
    ['Submission timelines', 'rd_reg.ops.submission_timelines', 'Regulatory Corpus (KA)'],
    ['HA correspondence', 'rd_reg.ops.ha_letters', 'Regulatory Corpus (KA)'],
  ],
  quality: [
    ['Deviations', 'demo.pharma.deviations', 'check_deviation_status'],
    ['CAPAs', 'demo.pharma.capas', 'Quality Genie'],
    ['Batch release', 'demo.pharma.batch_release', 'Quality Genie'],
  ],
  drafter: [],
};
// Read-only system grants the flagship agents hold beyond the tools the run script shows.
const FLAGSHIP_SYSTEMS: Record<string, string[]> = { regintel: ['rim-connector'], quality: ['lims-stability'] };
const FLAGSHIP_TABLE_DOMAIN: Record<string, string> = { clinical: 'rd-clin', regintel: 'rd-reg', quality: 'quality', drafter: 'rd-reg' };

export interface Reach {
  systems: AccessItem[];
  functions: AccessItem[];
  tables: AccessItem[];
  agents: Skill[];
  skills: Skill[];
}

export function agentReach(a: RoleAgent): Reach {
  const find = (id: string) => CATALOG.find((s) => s.id === id);
  const tools = [...a.tools, ...(FLAGSHIP_SYSTEMS[a.id] ?? [])].map(find).filter((s) => s !== undefined);
  const toolItems: AccessItem[] = tools.map((t) => ({
    key: t.id,
    label: t.name,
    ref: t.ucPath,
    group: t.type === 'MCP Service' ? 'system' : 'function',
    via: t.type === 'MCP Service' ? `MCP · ${t.runsOn ?? 'Databricks'}` : 'UC function',
    access: isWrite(t.id) ? 'write' : 'read',
    domainId: domainIdOf(t),
  }));
  const agents = a.calls.map(find).filter((s) => s !== undefined);

  let tables: AccessItem[];
  const flag = FLAGSHIP_TABLES[a.id] as [string, string, string][] | undefined;
  if (flag) {
    tables = flag.map(([label, ref, through]) => ({ key: ref, label, ref, group: 'table', via: 'UC table', access: 'read', domainId: FLAGSHIP_TABLE_DOMAIN[a.id], through }));
  } else {
    const mine = new Set([...a.skills, ...a.tools]);
    const caps = CAPABILITIES.filter((c) => c.podId === a.podId);
    const ids = new Set<string>();
    for (const c of caps) {
      const linked = c.links.filter(([from]) => mine.has(from)).map(([, to]) => to).filter((to) => c.data.some((d) => d.id === to));
      for (const id of linked) ids.add(id);
    }
    if (ids.size === 0 && a.tools.length + a.calls.length > 0) for (const c of caps) if (c.data[0]) ids.add(c.data[0].id);
    const domainData = DATA_ASSETS.filter((d) => d.domainId === a.domainId);
    if (agents.length > 0) {
      const extra = domainData.filter((d) => !ids.has(d.id)).slice(0, 2);
      for (const d of extra) ids.add(d.id);
    }
    tables = [...ids]
      .map((id) => DATA_ASSETS.find((d) => d.id === id))
      .filter((d) => d !== undefined)
      .slice(0, 5)
      .map((d) => ({
        key: d.id,
        label: d.name,
        ref: cleanRef(d.ref),
        group: 'table',
        via: d.ref.includes('volume') ? 'UC volume' : 'UC table',
        access: 'read',
        domainId: d.domainId,
        through: a.tools.some((t) => toolReads(a, t, d.id)) || !agents[0] ? tools[0]?.name : agents[0].name,
      }));
  }

  return {
    systems: toolItems.filter((t) => t.group === 'system'),
    functions: toolItems.filter((t) => t.group === 'function'),
    tables,
    agents,
    skills: a.skills.map(find).filter((s) => s !== undefined),
  };
}

function toolReads(a: RoleAgent, toolId: string, dataId: string): boolean {
  return CAPABILITIES.some((c) => c.podId === a.podId && c.links.some(([f, t]) => f === toolId && t === dataId));
}

// ── The intersection ───────────────────────────────────────────────────────────
export function blockedReason(p: Person, item: AccessItem): string | null {
  const who = isYou(p) ? 'You' : p.name;
  if (!p.domains.includes(item.domainId) && item.domainId !== 'enterprise') return `${who} ${isYou(p) ? 'have' : 'has'} no ${domainById(item.domainId).short} access`;
  if (p.lacks.some((x) => item.ref.includes(x))) return `${who} ${isYou(p) ? 'aren’t' : 'isn’t'} granted this`;
  if (item.access === 'write' && p.readOnly) return `${who} ${isYou(p) ? 'have' : 'has'} read-only access`;
  return null;
}

export function effective(r: Reach, p: Person) {
  const all = [...r.systems, ...r.functions, ...r.tables];
  const usable = all.filter((i) => blockedReason(p, i) === null);
  return { all, usable, blocked: all.filter((i) => blockedReason(p, i) !== null) };
}

// ── Acting modes and gates ─────────────────────────────────────────────────────
export interface AgentAction {
  label: string;
  mode: 'on_behalf_of' | 'as_self';
  tier: 0 | 1 | 2 | 3;
  gate: string;
}

export function actionsFor(r: Reach): AgentAction[] {
  const out: AgentAction[] = [];
  if (r.tables.length + r.systems.length + r.functions.filter((f) => f.access === 'read').length > 0) out.push({ label: 'Read sources', mode: 'on_behalf_of', tier: 0, gate: 'None · logged' });
  for (const g of r.agents) out.push({ label: `Ask ${g.name.replace(/ Agent$/, '')}`, mode: 'on_behalf_of', tier: 0, gate: 'None · logged' });
  out.push({ label: 'Write findings to the work plane', mode: 'as_self', tier: 1, gate: 'None · reversible' });
  for (const t of [...r.systems, ...r.functions].filter((x) => x.access === 'write')) {
    const gxpRecord = /rim|submit|capa|batch/.test(t.ref);
    out.push({ label: `Write via ${t.label}`, mode: 'on_behalf_of', tier: gxpRecord ? 3 : 2, gate: gxpRecord ? 'Validated e-signature' : 'Named approver signs off' });
  }
  return out;
}

export const riskTier = (actions: AgentAction[]) => Math.max(...actions.map((x) => x.tier)) as 0 | 1 | 2 | 3;

export function stopsAt(a: RoleAgent): string {
  const f = SRP_AGENTS.find((x) => x.id === a.id);
  if (f) return f.cannot[0];
  return 'Anything that commits GSK needs a named person';
}

// ── Identity, ownership, history ───────────────────────────────────────────────
const FLAGSHIP_VERSION: Record<string, string> = { clinical: '2.1.0', regintel: '1.4.0', quality: '1.2.0', drafter: '3.0.1' };
export const agentVersion = (a: RoleAgent) => FLAGSHIP_VERSION[a.id] ?? `1.${(hash(a.id) % 6).toString()}.0`;
export const agentSlug = (a: RoleAgent) => slug(a.name);
export const entraId = (a: RoleAgent) => `gsk-${agentSlug(a)}`;
const FLAGSHIP_SPONSOR: Record<string, string> = { clinical: 'Clinical Data Office', regintel: 'Global Regulatory Affairs', quality: 'Quality Assurance', drafter: 'Global Regulatory Affairs' };
// An agent's home department can differ from its pod's (the flagship pod staffs agents from three departments).
export const agentDomain = (a: RoleAgent) => FLAGSHIP_TABLE_DOMAIN[a.id] ?? a.domainId;
export const sponsorOf = (a: RoleAgent) => FLAGSHIP_SPONSOR[a.id] ?? domainById(a.domainId).owners[0];

export function denialsFor(a: RoleAgent) {
  const pod = podById(a.podId);
  return DENIALS.filter((d) => d.agent === a.name && d.pod === pod?.name);
}

export function triggersFor(a: RoleAgent) {
  const pod = podById(a.podId);
  return TRIGGERS.filter((t) => pod?.capabilityIds.includes(t.capabilityId));
}

// Metadata-driven development: every agent, capability and pod is a YAML manifest in Git.
// A platform loader compiles each manifest into identity, UC grants, Gateway policy, evals and an
// AppKit agent package. Display only; the YAML here is generated from the simulated estate.
import { CATALOG, DATA_ASSETS, DOMAINS, TRIGGERS, podById, podPlatformAgents, roleAgentById, slug, type PodDef, type RoleAgent } from './estate';
import type { Capability } from './capabilities';
import type { Skill } from './types';
import { actionsFor, agentDomain, agentReach, agentSlug, agentVersion, entraId, isWrite, riskTier, sponsorOf } from './access';
import { SRP_AGENTS } from './pods';

const ver = (v: string) => v.replace(/^v/, '');
const leaf = (ucPath: string) => ucPath.split('.').pop() ?? ucPath;
const refOf = (s: Skill) => s.ucPath.replace(/\s*\(.*?\)/g, '').trim();
const snake = (s: string) => slug(s).replace(/-/g, '_');
const pad = (s: string, n: number) => (s.length >= n ? `${s}  ` : s + ' '.repeat(n - s.length));
const podSemver = (p: PodDef) => `${ver(p.version)}.0`;
const tidy = (lines: string[]) => lines.map((l) => l.replace(/ {3,}#/, '  #')).join('\n');

export const LIFECYCLE = ['Author', 'Validate', 'Evaluate', 'Approve', 'Provision', 'Promote', 'Operate'] as const;

export interface Generated {
  label: string;
  value: string;
  system: string;
}

export interface ManifestBundle {
  path: string;
  files: { name: string; text: string }[];
  generated: Generated[];
  stage: number; // index into LIFECYCLE that is current
  lint: { ok: boolean; text: string }[];
}

// ── Agent ─────────────────────────────────────────────────────────────────────
export function agentManifest(a: RoleAgent): ManifestBundle {
  const r = agentReach(a);
  const actions = actionsFor(r);
  const tier = riskTier(actions);
  const pod = podById(a.podId);
  const flagship = SRP_AGENTS.find((x) => x.id === a.id);
  const skills = r.skills;
  const tools = [...r.systems, ...r.functions];
  const L: string[] = [
    'schema_version: 1',
    'kind: agent',
    'extends: platform/base-agent@1          # telemetry, sandbox, credential broker, environments',
    `name: ${agentSlug(a)}`,
    `version: ${agentVersion(a)}`,
    `description: ${flagship?.role ?? `${a.name} for ${pod?.name ?? 'its pod'}.`}`,
    `domain: ${agentDomain(a)}`,
    `pod: ${a.podId}@${pod ? podSemver(pod) : '1.0.0'}`,
    '',
    'identity:',
    `  entra_agent_id: ${entraId(a)}`,
    '  service_principal: auto              # the pipeline provisions it; never an inline key',
    `  sponsor: ${sponsorOf(a)}`,
    `risk_tier: ${tier.toString()}                           # derived: the highest tier of any action below`,
    'runtime: role_runner',
    'hosting: shared_pool',
    `model_policy: gateway/${agentDomain(a)}-default   # ${a.model}, rate limit, spend cap`,
    '',
    'skills:                                 # know-how, pinned',
    ...(skills.length ? skills.map((s) => `  - ${refOf(s)}@${ver(s.version)}`) : ['  []']),
    'tools:',
    ...(tools.length
      ? tools.flatMap((t) => {
          const act = actions.find((x) => x.label === `Write via ${t.label}`);
          return [`  - ref: ${t.ref}`, `    access: ${t.access}${act ? `                     # tier ${act.tier.toString()}, set by the tool owner` : ''}`];
        })
      : ['  []']),
    'data:',
    ...(r.tables.length ? r.tables.flatMap((t) => [`  - ref: ${t.ref}`, '    access: read']) : ['  []                                    # works only from other agents’ findings']),
    ...(r.agents.length ? ['agents:                                 # Databricks agents it works with', ...r.agents.map((g) => `  - ref: ${g.type === 'Genie Agent' ? 'genie' : 'ka'}/${slug(g.name)}`)] : []),
    '',
    'actions:                                # acting mode and approval tier per action',
    ...actions.map((x) => `  ${pad(`${snake(x.label)}:`, 30)}{ mode: ${x.mode}, tier: ${x.tier.toString()} }`),
    'delegation:',
    '  on_behalf_of: requester               # triggers act for the pod owner',
    '  mechanism: oauth_token_exchange       # effective access = agent ∩ person',
    '',
    'evals:',
    `  suite: ${agentDomain(a).replace('-', '_')}.evals.${snake(a.name)}`,
    '  release_threshold: 0.85',
    '  auto_suspend_below: 0.70',
  ];

  const skillMd = skills[0];
  const md = [
    `# config/agents/${agentSlug(a)}/agent.md · written by the loader, not by hand`,
    '---',
    `endpoint: ${a.model}`,
    'tools:                                  # ambient tools the loader wires with mcpServer()',
    ...(tools.length + r.agents.length ? [...tools.map((t) => `  - ${leaf(t.ref)}`), ...r.agents.map((g) => `  - ${snake(g.name)}`)] : ['  []']),
    'default: false',
    '---',
    '',
    `${flagship?.role ?? `You are ${a.name}.`}`,
    'Tool calls run as the requesting user (asUser), so you only ever see what they can see.',
    '',
    ...(skillMd ? [`<!-- SKILL.md pinned: ${refOf(skillMd)}@${ver(skillMd.version)} -->`, skillMd.description] : []),
  ];

  const grants = skills.length + tools.length + r.tables.length + r.agents.length;
  return {
    path: `gsk-agents/${agentDomain(a)}/agents/${agentSlug(a)}.yaml`,
    files: [
      { name: 'agent.yaml', text: tidy(L) },
      { name: 'agent.md (generated)', text: tidy(md) },
    ],
    generated: [
      { label: 'Identity', value: `${entraId(a)} + service principal`, system: 'Entra Agent ID · UC' },
      { label: 'UC grants', value: `${grants.toString()} (${skills.length.toString()} skill · ${tools.length.toString()} tool · ${r.tables.length.toString()} data · ${r.agents.length.toString()} agent)`, system: 'Unity Catalog' },
      { label: 'Gateway policy', value: 'model, rate limit, spend cap', system: 'Unity AI Gateway' },
      { label: 'Delegation', value: 'acts for the requester', system: 'Token exchange' },
      { label: 'Eval job + monitor', value: 'release ≥ 0.85 · suspend < 0.70', system: 'MLflow' },
      { label: 'Agent package', value: 'agent.md', system: 'AppKit agents (Beta)' },
    ],
    stage: 6,
    lint: [
      { ok: true, text: 'Schema valid' },
      { ok: skills.every((s) => s.status === 'Certified'), text: skills.every((s) => s.status === 'Certified') ? 'Skills exist at pinned versions' : 'A pinned skill is not certified' },
      { ok: true, text: `Risk tier ${tier.toString()} matches its actions` },
      { ok: true, text: 'No tool outside the manifest' },
    ],
  };
}

// ── Capability ────────────────────────────────────────────────────────────────
export function capabilityManifest(c: Capability, skillsCatalog: Skill[] = CATALOG): ManifestBundle {
  const get = (id: string) => skillsCatalog.find((s) => s.id === id);
  const pod = c.podId ? podById(c.podId) : undefined;
  const usedBy = (toolId: string) => c.links.find(([from, to]) => to === toolId && get(from)?.type === 'UC Skill')?.[0];
  const readVia = (dataId: string) => c.links.find(([, to]) => to === dataId)?.[0];
  const dataRef = (d: Capability['data'][number]) => DATA_ASSETS.find((x) => x.id === d.id)?.ref ?? d.ref;
  const L: string[] = [
    'schema_version: 1',
    'kind: capability',
    `name: ${slug(c.name)}`,
    `title: ${c.name}`,
    `version: ${ver(c.version)}.0`,
    `domain: ${c.domainId}`,
    `owner: ${c.owner}`,
    `served_by: ${pod ? `${pod.id}@${podSemver(pod)}` : 'none yet                    # a pod is assigned at certification'}`,
    '',
    'skills:                                 # how the work is done',
    ...(c.skills.length ? c.skills.map((id) => get(id)).filter((s) => s !== undefined).map((s) => `  - ${refOf(s)}@${ver(s.version)}`) : ['  []']),
    'tools:                                  # how it acts on GSK systems',
    ...(c.tools.length
      ? c.tools.flatMap((id) => {
          const t = get(id);
          if (!t) return [];
          const by = usedBy(id);
          const byS = by ? get(by) : undefined;
          return [`  - ref: ${refOf(t)}`, `    access: ${isWrite(id) ? 'write' : 'read'}`, ...(byS ? [`    used_by: ${leaf(refOf(byS))}`] : [])];
        })
      : ['  []']),
    'data:                                   # evidence, referenced not copied',
    ...(c.data.length
      ? c.data.flatMap((d) => {
          const raw = dataRef(d);
          const via = readVia(d.id);
          const viaS = via ? get(via) : undefined;
          return [`  - ref: ${raw.replace(/\s*\(.*?\)/g, '').split(',')[0].trim()}${raw.includes('volume') ? '     # volume' : ''}`, ...(viaS ? [`    read_via: ${leaf(refOf(viaS))}`] : [])];
        })
      : ['  []']),
    'context:',
    `  fields: [${c.context.map((x) => x.key).join(', ')}]`,
    '  ontology:                             # Genie Ontology snippets (Public Preview)',
    ...(c.ontology.length ? c.ontology.map((o) => `    - "${o.text.replace(/"/g, '“')}"   # ${o.origin} · ${o.authority.toFixed(2)}`) : ['    []']),
  ];
  const stage = c.status === 'Live' ? 6 : c.inReview ? 3 : 1;
  const uncertified = [...c.skills, ...c.tools].map(get).filter((s) => s && s.status !== 'Certified');
  const unlinked = c.tools.filter((t) => !usedBy(t)).length + c.data.filter((d) => !readVia(d.id)).length;
  return {
    path: `gsk-agents/${c.domainId}/capabilities/${slug(c.name)}.yaml`,
    files: [{ name: 'capability.yaml', text: tidy(L) }],
    generated: [
      { label: 'Registered as', value: `${c.domainId.replace('-', '_')}.capabilities.${snake(c.name)}`, system: 'UC (parent skill)' },
      { label: 'UC grants', value: `${(c.skills.length + c.tools.length + c.data.length).toString()} to the pod’s agents`, system: 'Unity Catalog' },
      { label: 'Context binding', value: `${c.context.length.toString()} fields · ${c.ontology.length.toString()} snippets`, system: 'Genie Ontology' },
      { label: 'Budget', value: pod ? `shares gateway/${pod.id}` : 'set when a pod is assigned', system: 'Unity AI Gateway' },
      { label: 'Eval job', value: 'release gate on the golden set', system: 'MLflow' },
    ],
    stage,
    lint: [
      { ok: true, text: 'Schema valid' },
      { ok: uncertified.length === 0, text: uncertified.length === 0 ? 'Everything it uses is certified' : `${uncertified.length.toString()} uncertified item(s)` },
      { ok: unlinked === 0, text: unlinked === 0 ? 'Every tool and data source is linked' : `${unlinked.toString()} item(s) not linked yet` },
      { ok: pod !== undefined, text: pod ? `Served by ${pod.name}` : 'No pod yet' },
    ],
  };
}

// ── Pod ───────────────────────────────────────────────────────────────────────
export function podManifest(p: PodDef, caps: Capability[]): ManifestBundle {
  const agents = p.agentIds.map((id) => roleAgentById(id)).filter((a) => a !== undefined);
  const workers = agents.slice(0, -1);
  const drafter = agents[agents.length - 1];
  const platform = podPlatformAgents(p);
  const triggers = TRIGGERS.filter((t) => p.capabilityIds.includes(t.capabilityId));
  const tier = /Tier (\d)/.exec(p.autonomyTier)?.[1] ?? '2';
  const L: string[] = [
    'schema_version: 1',
    'kind: pod',
    'extends: platform/base-pod@1',
    `name: ${p.id}`,
    `version: ${podSemver(p)}`,
    `owner: ${p.owner}`,
    `domain: ${p.domainId}`,
    'runtime: role_runner                    # one runtime per pod',
    '',
    'serves:',
    ...caps.map((c) => `  - ${slug(c.name)}@${ver(c.version)}.0`),
    'agents:                                 # pinned; the pod runner staffs these',
    ...agents.map((a) => `  - ${agentSlug(a)}@${agentVersion(a)}`),
    ...(platform.length ? ['databricks_agents:', ...platform.map((g) => `  - ${g.type === 'Genie Agent' ? 'genie' : 'ka'}/${slug(g.name)}`)] : []),
    '',
    'handoffs:                               # hub-and-spoke through the pod runner',
    ...(drafter && workers.length ? [`  - from: [${workers.map(agentSlug).join(', ')}]`, `    to: ${agentSlug(drafter)}`, '    on: findings_ready'] : ['  []']),
    'gates:',
    '  - action: sign_off',
    `    tier: ${tier}`,
    '    approver: requester',
    ...(triggers.length
      ? ['triggers:                               # every trigger names a requester', ...triggers.flatMap((t) => [`  - type: ${t.kind.toLowerCase()}`, `    when: "${t.when}"`, '    requester: pod_owner'])]
      : []),
    `budget: gateway/${p.id}-monthly`,
  ];
  return {
    path: `gsk-agents/${p.domainId}/pods/${p.id}.yaml`,
    files: [{ name: 'pod.yaml', text: tidy(L) }],
    generated: [
      { label: 'Pod registration', value: `${agents.length.toString()} agents pinned`, system: 'Work plane' },
      { label: 'Gates', value: `sign-off at tier ${tier}`, system: 'Work plane' },
      { label: 'Triggers', value: triggers.length ? `${triggers.length.toString()} subscribed` : 'none', system: 'Event bus' },
      { label: 'Budget', value: 'per-request ceiling + monthly envelope', system: 'Unity AI Gateway' },
    ],
    stage: p.status === 'Sandbox' ? 2 : 6,
    lint: [
      { ok: true, text: 'Schema valid' },
      { ok: true, text: 'Every agent pinned to an existing version' },
      { ok: true, text: 'One runtime for the whole pod' },
    ],
  };
}

// ── Parse a capability manifest back into composer state (the YAML side of the composer) ──
export interface ParsedCapability {
  title?: string;
  domainId?: string;
  skills: string[];
  toolFor: Record<string, string>;
  dataVia: Record<string, string>;
  fields?: string[];
  errors: string[];
}

export function parseCapabilityYaml(text: string, catalog: Skill[]): ParsedCapability {
  const out: ParsedCapability = { skills: [], toolFor: {}, dataVia: {}, errors: [] };
  const byRef = (ref: string) => catalog.find((s) => refOf(s) === ref);
  const byLeaf = (l: string, ids: string[]) => ids.find((id) => { const s = catalog.find((x) => x.id === id); return s ? leaf(refOf(s)) === l : false; });
  let section = '';
  let current: { kind: 'tool' | 'data'; id: string } | null = null;
  const pendingUse: [string, string][] = [];
  const pendingVia: [string, string][] = [];

  text.split('\n').forEach((raw, i) => {
    const line = raw.replace(/\s+#.*$/, '').replace(/^#.*$/, '');
    if (!line.trim()) return;
    const n = (i + 1).toString();
    const top = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (top) {
      section = top[1];
      current = null;
      if (section === 'title') out.title = top[2].trim();
      if (section === 'domain') {
        const d = top[2].trim();
        if (DOMAINS.some((x) => x.id === d)) out.domainId = d;
        else out.errors.push(`Line ${n}: domain “${d}” doesn’t exist`);
      }
      return;
    }
    const item = /^\s*-\s*(?:ref:\s*)?(.+)$/.exec(line);
    const field = /^\s+([a-z_]+):\s*(.+)$/.exec(line);
    if (section === 'skills' && item) {
      const [ref] = item[1].trim().split('@');
      const s = byRef(ref);
      if (s?.type === 'UC Skill') out.skills.push(s.id);
      else out.errors.push(`Line ${n}: “${ref}” is not a UC Skill in the catalog`);
    } else if (section === 'tools' && item) {
      const s = byRef(item[1].trim());
      if (s && (s.type === 'UC Function' || s.type === 'MCP Service')) {
        out.toolFor[s.id] = '';
        current = { kind: 'tool', id: s.id };
      } else {
        out.errors.push(`Line ${n}: “${item[1].trim()}” is not a governed tool`);
        current = null;
      }
    } else if (section === 'tools' && field && current?.kind === 'tool' && field[1] === 'used_by') {
      pendingUse.push([current.id, field[2].trim()]);
    } else if (section === 'data' && item) {
      const ref = item[1].trim();
      const d = DATA_ASSETS.find((x) => x.ref.replace(/\s*\(.*?\)/g, '').split(',')[0].trim() === ref);
      if (d) {
        out.dataVia[d.id] = '';
        current = { kind: 'data', id: d.id };
      } else {
        out.errors.push(`Line ${n}: “${ref}” is not a UC asset you can reference`);
        current = null;
      }
    } else if (section === 'data' && field && current?.kind === 'data' && field[1] === 'read_via') {
      pendingVia.push([current.id, field[2].trim()]);
    } else if (section === 'context' && field && field[1] === 'fields') {
      out.fields = field[2].replace(/[[\]]/g, '').split(',').map((x) => x.trim()).filter(Boolean);
    }
  });

  for (const [tool, l] of pendingUse) {
    const id = byLeaf(l, out.skills);
    if (id) out.toolFor[tool] = id;
    else out.errors.push(`used_by “${l}” isn’t one of the listed skills`);
  }
  for (const [data, l] of pendingVia) {
    const id = byLeaf(l, [...Object.keys(out.toolFor), ...out.skills]);
    if (id) out.dataVia[data] = id;
    else out.errors.push(`read_via “${l}” isn’t a listed tool or skill`);
  }
  if (out.skills.length === 0 && out.errors.length === 0) out.errors.push('A capability needs at least one skill');
  return out;
}


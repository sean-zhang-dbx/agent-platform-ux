// Simulated enterprise estate. Deterministic (seeded) so every load looks the same.
// The Submission Readiness flagship keeps its hand-written ids and data; everything else is generated.
import { FLAGSHIP, SRA_ID, type Capability, type OntologySnippet } from './capabilities';
import { PODS as SEED_PODS, SRP_AGENTS, SRP_ID } from './pods';
import { SEED_SKILLS } from './skills';
import type { GxpTier, Pod, Skill, SkillStatus, SkillType } from './types';

// ── RNG ────────────────────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260924);
const between = (lo: number, hi: number) => lo + rnd() * (hi - lo);
const int = (lo: number, hi: number) => Math.floor(between(lo, hi + 1));
const pick = <T,>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)];

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Platform building blocks (status per Databricks docs, Sep 2026) ─────────────
export type Maturity = 'GA' | 'Public Preview' | 'Beta';
export const PLATFORM: { id: string; name: string; status: Maturity; note: string }[] = [
  { id: 'uc-skills', name: 'Unity Catalog Skills', status: 'Beta', note: 'Governed SKILL.md as a UC securable' },
  { id: 'genie-ontology', name: 'Genie Ontology', status: 'Public Preview', note: 'Context layer for Genie One and Genie Code' },
  { id: 'genie-agents', name: 'Genie Agents', status: 'GA', note: 'Natural-language agents over UC data' },
  { id: 'knowledge-assistant', name: 'Knowledge Assistant', status: 'GA', note: 'Cited answers over documents' },
  { id: 'uc-functions', name: 'Unity Catalog functions', status: 'GA', note: 'Governed tool calls' },
  { id: 'mcp-services', name: 'MCP services + ABAC grants', status: 'Beta', note: 'Governed access to external systems' },
  { id: 'external-agents', name: 'External agents via UC connection', status: 'Public Preview', note: 'e.g. Vertex AI agents on GCP' },
  { id: 'appkit-agents', name: 'AppKit agents plugin', status: 'Beta', note: 'Runtime for GSK-built agents in a Databricks App' },
  { id: 'ai-gateway', name: 'AI Gateway budgets & routing', status: 'GA', note: 'Spend caps, attribution, routing' },
  { id: 'mlflow-tracing', name: 'MLflow tracing', status: 'GA', note: 'End-to-end traces' },
  { id: 'prod-monitoring', name: 'MLflow production monitoring', status: 'Beta', note: 'Scheduled scorers on live traces' },
];

// ── Domains ────────────────────────────────────────────────────────────────────
export interface DomainDef {
  id: string;
  name: string;
  short: string;
  bu: string;
  gxp: boolean;
  tier: string;
  owners: string[];
  context: string[];
}

interface DomainSeed extends DomainDef {
  caps: [string, string][]; // [id, name]
  capPod: number[]; // capability index -> pod index
  pods: [string, string][]; // [id, name]
  skills: string[];
  tools: [string, SkillType, string][]; // name, type, runs on
  platformAgents: [string, SkillType, string][];
  data: [string, string][]; // name, UC ref
}

const SEEDS: DomainSeed[] = [
  {
    id: 'rd-clin', name: 'R&D Clinical', short: 'Clinical', bu: 'R&D', gxp: true, tier: 'Tier 2',
    owners: ['Clinical Data Office', 'Clinical Operations', 'Safety & Pharmacovigilance'],
    context: ['Study', 'Phase', 'Therapeutic area', 'User'],
    caps: [['assess-trial-feasibility', 'Assess trial feasibility'], ['draft-csr-section', 'Draft a CSR section'], ['monitor-site-enrollment', 'Monitor site enrollment'], ['summarise-safety-signals', 'Summarise safety signals'], ['prepare-dsmb-pack', 'Prepare a DSMB pack']],
    capPod: [0, 1, 2, 3, 3],
    pods: [['trial-feasibility', 'Trial Feasibility Pod'], ['csr-authoring', 'CSR Authoring Pod'], ['enrollment-watch', 'Enrollment Watch Pod'], ['safety-review', 'Safety Review Pod']],
    skills: ['Protocol Feasibility Scoring', 'Site Selection Criteria', 'CSR Section Authoring', 'Clinical Summary Authoring', 'Enrollment Forecasting', 'Recruitment Risk Rules', 'Safety Signal Triage', 'MedDRA Coding Rules', 'DSMB Pack Assembly', 'Blinding Safeguards', 'Patient Diversity Planning', 'Estimand Framing'],
    tools: [['get_enrollment_by_site', 'UC Function', 'Databricks'], ['CTMS Connector', 'MCP Service', 'SaaS · Veeva'], ['EDC Query Log', 'MCP Service', 'SaaS · Medidata'], ['get_clinical_summary', 'UC Function', 'Databricks'], ['get_adverse_events', 'UC Function', 'Databricks'], ['save_csr_draft', 'UC Function', 'Databricks'], ['Site Feasibility Survey', 'MCP Service', 'Azure']],
    platformAgents: [['Clinical Trials Genie Agent', 'Genie Agent', 'Databricks'], ['Safety Database Genie', 'Genie Agent', 'Databricks'], ['Protocol Library', 'Knowledge Assistant', 'Databricks']],
    data: [['Clinical trial results', 'demo.pharma.clinical_trials'], ['Site enrollment', 'rd_clinical.ops.site_enrollment'], ['Adverse events', 'rd_clinical.safety.adverse_events'], ['Protocol documents', 'rd_clinical.docs.protocols (volume)']],
  },
  {
    id: 'rd-reg', name: 'R&D Regulatory', short: 'Regulatory', bu: 'R&D', gxp: true, tier: 'Tier 2',
    owners: ['Global Regulatory Affairs', 'Regulatory Operations'],
    context: ['Product', 'Region', 'Procedure', 'User'],
    caps: [[SRA_ID, 'Assess submission readiness'], ['answer-ha-query', 'Answer a health-authority query'], ['build-submission-plan', 'Build a submission plan'], ['track-reg-commitments', 'Track regulatory commitments'], ['compare-label-versions', 'Compare label versions']],
    capPod: [0, 1, 2, 3, 3],
    pods: [[SRP_ID, 'Submission Readiness Pod'], ['ha-response', 'HA Response Pod'], ['submission-planning', 'Submission Planning Pod'], ['label-commitments', 'Label & Commitments Pod']],
    skills: ['Regulatory Precedent Analysis', 'Submission Readiness Report', 'HA Query Response Drafting', 'Health Authority Tone Guide', 'Submission Planning Rules', 'eCTD Module Mapping', 'Commitment Tracking', 'Regional Requirements', 'Label Change Assessment', 'Labeling Consistency Check', 'Dossier Gap Analysis', 'Briefing Book Authoring'],
    tools: [['save_report_draft', 'UC Function', 'Databricks'], ['RIM Connector', 'MCP Service', 'SaaS · Veeva'], ['get_submission_timeline', 'UC Function', 'Databricks'], ['label_text_diff', 'UC Function', 'Databricks'], ['HA Correspondence', 'MCP Service', 'SaaS · Veeva'], ['eCTD Viewer', 'MCP Service', 'Azure']],
    platformAgents: [['Regulatory Document Corpus', 'Knowledge Assistant', 'Databricks'], ['Regulatory Intelligence Genie', 'Genie Agent', 'Databricks'], ['Health Authority Guidance', 'Knowledge Assistant', 'Databricks']],
    data: [['Regulatory history', 'demo.pharma.regulatory_docs (volume)'], ['Submission timelines', 'rd_reg.ops.submission_timelines'], ['Label versions', 'rd_reg.docs.labels (volume)'], ['HA correspondence', 'rd_reg.ops.ha_letters']],
  },
  {
    id: 'quality', name: 'Quality', short: 'Quality', bu: 'Global Supply Chain', gxp: true, tier: 'Tier 1',
    owners: ['Quality Engineering Team', 'Quality Assurance'],
    context: ['Site', 'Product', 'Lot', 'User'],
    caps: [['triage-deviation', 'Triage a deviation'], ['draft-capa', 'Draft a CAPA'], ['review-batch-record', 'Review a batch record'], ['prepare-audit-readiness', 'Prepare for an audit'], ['trend-complaints', 'Trend product complaints']],
    capPod: [0, 1, 2, 3, 3],
    pods: [['deviation-triage', 'Deviation Triage Pod'], ['capa', 'CAPA Pod'], ['batch-review', 'Batch Review Pod'], ['audit-complaints', 'Audit & Complaints Pod']],
    skills: ['Deviation Triage Procedure', 'Quality Gate Assessment', 'CAPA Authoring', 'Root Cause Framing', 'Batch Record Review Rules', 'Data Integrity Checks', 'Audit Readiness Checklist', 'Supplier Quality Review', 'Complaint Trending', 'Risk Assessment (FMEA)', 'Change Control Impact', 'Annual Product Review'],
    tools: [['check_deviation_status', 'UC Function', 'Databricks'], ['LIMS Stability Data', 'MCP Service', 'Azure'], ['get_batch_record', 'UC Function', 'Databricks'], ['QMS Connector', 'MCP Service', 'SaaS · Veeva'], ['Complaint Intake', 'MCP Service', 'SaaS · Salesforce'], ['save_capa_draft', 'UC Function', 'Databricks']],
    platformAgents: [['Quality & Deviations Genie Agent', 'Genie Agent', 'Databricks'], ['Audit Findings Library', 'Knowledge Assistant', 'Databricks'], ['Batch Genealogy Genie', 'Genie Agent', 'Databricks']],
    data: [['Deviations & batch release', 'demo.pharma.deviations'], ['Batch records', 'quality.mfg.batch_records'], ['Complaints', 'quality.pv.complaints'], ['Audit findings', 'quality.audit.findings']],
  },
  {
    id: 'supply', name: 'Supply Chain', short: 'Supply', bu: 'Global Supply Chain', gxp: false, tier: 'Tier 2',
    owners: ['Supply Chain Planning', 'Procurement'],
    context: ['Market', 'SKU', 'Horizon', 'User'],
    caps: [['forecast-demand-shortfall', 'Forecast a demand shortfall'], ['rebalance-inventory', 'Rebalance inventory'], ['assess-supplier-risk', 'Assess supplier risk'], ['plan-launch-supply', 'Plan launch supply'], ['explain-stock-out', 'Explain a stock-out']],
    capPod: [0, 1, 2, 3, 3],
    pods: [['demand-sensing', 'Demand Sensing Pod'], ['inventory', 'Inventory Pod'], ['supplier-risk', 'Supplier Risk Pod'], ['launch-stockout', 'Launch & Stock-out Pod']],
    skills: ['Demand Sensing', 'Shortfall Escalation Rules', 'Inventory Rebalancing', 'Allocation Policy', 'Supplier Risk Scoring', 'Dual Sourcing Rules', 'Launch Supply Planning', 'Cold Chain Rules', 'Stock-out Root Cause', 'Safety Stock Tuning', 'S&OP Narrative', 'Logistics Lane Selection'],
    tools: [['get_inventory_position', 'UC Function', 'Databricks'], ['SAP IBP Connector', 'MCP Service', 'SaaS · SAP'], ['Supplier Portal', 'MCP Service', 'Azure'], ['get_demand_forecast', 'UC Function', 'Databricks'], ['Shipment Tracking', 'MCP Service', 'SaaS'], ['create_transfer_order', 'UC Function', 'Databricks']],
    platformAgents: [['Supply Chain Control Tower Genie', 'Genie Agent', 'Databricks'], ['Supplier Contracts Library', 'Knowledge Assistant', 'Databricks'], ['Demand Planner (Vertex AI)', 'Genie Agent', 'GCP · Vertex AI']],
    data: [['Inventory positions', 'gsc.planning.inventory'], ['Demand forecasts', 'gsc.planning.demand_forecast'], ['Supplier scorecards', 'gsc.procurement.supplier_scores'], ['Shipments', 'gsc.logistics.shipments']],
  },
  {
    id: 'mfg', name: 'Manufacturing & CMC', short: 'Manufacturing', bu: 'Global Supply Chain', gxp: true, tier: 'Tier 2',
    owners: ['Manufacturing Science', 'CMC Analytics'],
    context: ['Site', 'Line', 'Product', 'User'],
    caps: [['investigate-yield-drop', 'Investigate a yield drop'], ['summarise-stability-data', 'Summarise stability data'], ['review-tech-transfer', 'Review a tech transfer'], ['plan-equipment-maintenance', 'Plan equipment maintenance'], ['check-process-capability', 'Check process capability']],
    capPod: [0, 1, 2, 3, 3],
    pods: [['yield-investigation', 'Yield Investigation Pod'], ['stability', 'Stability Pod'], ['tech-transfer', 'Tech Transfer Pod'], ['plant-reliability', 'Plant Reliability Pod']],
    skills: ['Yield Investigation', 'Batch Genealogy Tracing', 'Stability Trend Summary', 'OOS Investigation', 'Tech Transfer Review', 'Scale-up Risk Review', 'Maintenance Planning', 'Equipment Qualification', 'Process Capability (Cpk)', 'Continued Process Verification', 'Cleaning Validation Rules', 'Environmental Monitoring'],
    tools: [['get_process_history', 'UC Function', 'Databricks'], ['MES Connector', 'MCP Service', 'Azure'], ['Historian Tags', 'MCP Service', 'Azure'], ['get_stability_timepoints', 'UC Function', 'Databricks'], ['CMMS Work Orders', 'MCP Service', 'SaaS · SAP']],
    platformAgents: [['Manufacturing Genie', 'Genie Agent', 'Databricks'], ['CMC Stability Genie', 'Genie Agent', 'Databricks'], ['Tech Transfer Library', 'Knowledge Assistant', 'Databricks']],
    data: [['Process history', 'mfg.ops.process_history'], ['Stability study results', 'mfg.cmc.stability_results'], ['Maintenance logs', 'mfg.eng.maintenance_logs'], ['Environmental monitoring', 'mfg.qc.env_monitoring']],
  },
  {
    id: 'commercial', name: 'Commercial', short: 'Commercial', bu: 'Commercial', gxp: false, tier: 'Tier 1',
    owners: ['Commercial Excellence', 'Medical, Legal & Regulatory'],
    context: ['Brand', 'Market', 'Channel', 'User'],
    caps: [['check-promo-claims', 'Check promotional claims'], ['plan-omnichannel-journey', 'Plan an omnichannel journey'], ['summarise-hcp-engagement', 'Summarise HCP engagement'], ['draft-brand-plan', 'Draft a brand plan section'], ['explain-sales-variance', 'Explain sales variance']],
    capPod: [0, 0, 1, 2, 3],
    pods: [['omnichannel', 'Omnichannel Content Pod'], ['hcp-insights', 'HCP Insights Pod'], ['brand-planning', 'Brand Planning Pod'], ['sales-analytics', 'Sales Analytics Pod']],
    skills: ['MLR Claims Check', 'Fair Balance Check', 'Journey Orchestration', 'Next-best-action Rules', 'HCP Segmentation', 'Content Tagging', 'Brand Plan Authoring', 'Market Access Narrative', 'Sales Variance Analysis', 'Territory Alignment', 'Campaign Measurement', 'Competitive Insight Summary'],
    tools: [['CRM HCP Engagement', 'MCP Service', 'SaaS · Salesforce'], ['Marketing Cloud', 'MCP Service', 'SaaS · Salesforce'], ['get_sales_by_territory', 'UC Function', 'Databricks'], ['PromoMats', 'MCP Service', 'SaaS · Veeva'], ['Content DAM', 'MCP Service', 'Azure'], ['publish_journey_draft', 'UC Function', 'Databricks']],
    platformAgents: [['Insights Navigator Genie', 'Genie Agent', 'Databricks'], ['Brand Content Library', 'Knowledge Assistant', 'Databricks'], ['Market Research Agent (Vertex AI)', 'Genie Agent', 'GCP · Vertex AI']],
    data: [['HCP engagement', 'commercial.crm.hcp_engagement'], ['Sales by territory', 'commercial.sales.territory'], ['Approved claims', 'commercial.mlr.approved_claims'], ['Campaign results', 'commercial.marketing.campaigns']],
  },
  {
    id: 'medical', name: 'Medical Affairs', short: 'Medical', bu: 'Medical', gxp: false, tier: 'Tier 1',
    owners: ['Medical Affairs', 'Medical Information'],
    context: ['Product', 'Country', 'Audience', 'User'],
    caps: [['answer-med-info-request', 'Answer a medical information request'], ['summarise-publication', 'Summarise a publication'], ['plan-advisory-board', 'Plan an advisory board'], ['track-kol-insights', 'Track KOL insights'], ['draft-scientific-response', 'Draft a scientific response']],
    capPod: [0, 1, 2, 3, 3],
    pods: [['medical-information', 'Medical Information Pod'], ['publications', 'Publications Pod'], ['advisory-board', 'Advisory Board Pod'], ['scientific-response', 'Scientific Response Pod']],
    skills: ['Medical Information Response', 'Off-label Guardrails', 'Publication Summary', 'Evidence Grading', 'Advisory Board Planning', 'Congress Coverage', 'KOL Insight Capture', 'Adverse Event Detection', 'Scientific Response Authoring', 'Standard Response Rules', 'Literature Screening', 'Medical Narrative'],
    tools: [['PubMed Search', 'MCP Service', 'SaaS'], ['get_med_info_history', 'UC Function', 'Databricks'], ['Medical CRM', 'MCP Service', 'SaaS · Veeva'], ['Congress Abstracts', 'MCP Service', 'SaaS'], ['save_response_draft', 'UC Function', 'Databricks']],
    platformAgents: [['Medical Affairs Genie', 'Genie Agent', 'Databricks'], ['Standard Response Library', 'Knowledge Assistant', 'Databricks'], ['Literature Review Agent (Vertex AI)', 'Genie Agent', 'GCP · Vertex AI']],
    data: [['Medical information requests', 'medical.mi.requests'], ['Publications', 'medical.pubs.library (volume)'], ['KOL interactions', 'medical.field.kol_interactions']],
  },
  {
    id: 'enterprise', name: 'Enterprise Functions', short: 'Enterprise', bu: 'Corporate', gxp: false, tier: 'Tier 3',
    owners: ['Enterprise Quality Systems', 'Finance Ops', 'IT Service Management', 'People & HR'],
    context: ['Function', 'Country', 'Policy', 'User'],
    caps: [['answer-sop-question', 'Answer an SOP question'], ['onboard-new-hire', 'Onboard a new hire'], ['reconcile-finance-close', 'Reconcile a finance close'], ['triage-it-incident', 'Triage an IT incident'], ['review-contract-clause', 'Review a contract clause']],
    capPod: [0, 0, 1, 2, 3],
    pods: [['business-companion', 'Business Companion Pod'], ['finance-close', 'Finance Close Pod'], ['it-service', 'IT Service Pod'], ['contracts', 'Contracts Pod']],
    skills: ['SOP Answering', 'Policy Change Summary', 'Onboarding Plan', 'Training Assignment', 'Finance Close Reconciliation', 'Expense Audit Rules', 'IT Incident Triage', 'Access Request Review', 'Contract Clause Review', 'Vendor Onboarding', 'Travel Policy Guidance', 'Records Retention Rules'],
    tools: [['Workday Connector', 'MCP Service', 'SaaS · Workday'], ['ServiceNow', 'MCP Service', 'SaaS · ServiceNow'], ['get_gl_balances', 'UC Function', 'Databricks'], ['S/4 Finance', 'MCP Service', 'SaaS · SAP'], ['Contract Repository', 'MCP Service', 'Azure'], ['create_it_ticket', 'UC Function', 'Databricks']],
    platformAgents: [['SOP & Policy Library', 'Knowledge Assistant', 'Databricks'], ['Finance Genie', 'Genie Agent', 'Databricks'], ['HR Policy Genie', 'Genie Agent', 'Databricks']],
    data: [['SOP library', 'corp.policy.sop_library (volume)'], ['GL balances', 'corp.finance.gl_balances'], ['IT incidents', 'corp.it.incidents'], ['Contracts', 'corp.legal.contracts (volume)']],
  },
];

export const DOMAINS: DomainDef[] = SEEDS.map(({ id, name, short, bu, gxp, tier, owners, context }) => ({ id, name, short, bu, gxp, tier, owners, context }));
export const domainById = (id: string): DomainDef => DOMAINS.find((d) => d.id === id) ?? DOMAINS[0];

// ── Catalog: skills, tools, Databricks agents ─────────────────────────────────
const SEED_DOMAIN: Record<string, string> = {
  'clinical-summary-authoring': 'rd-clin', 'get-clinical-summary': 'rd-clin', 'clinical-trials-genie': 'rd-clin',
  'regulatory-precedent-analysis': 'rd-reg', 'regulatory-corpus-ka': 'rd-reg', 'readiness-report-template': 'rd-reg', 'rim-connector': 'rd-reg', 'save-report-draft': 'rd-reg',
  'check-deviation-status': 'quality', 'quality-genie': 'quality', 'quality-gate-assessment': 'quality', 'lims-stability': 'quality',
  'sop-policy-library': 'enterprise', 'hcp-engagement': 'commercial', 'mlr-claims-check': 'commercial',
};
const SEED_RUNS_ON: Record<string, string> = { 'rim-connector': 'SaaS · Veeva', 'lims-stability': 'Azure', 'hcp-engagement': 'SaaS · Salesforce' };

const catalog: Skill[] = SEED_SKILLS.map((s) => {
  const d = domainById(SEED_DOMAIN[s.id] ?? 'enterprise');
  return { ...s, domain: d.name, runsOn: s.type === 'UC Skill' ? undefined : (SEED_RUNS_ON[s.id] ?? 'Databricks') };
});
const byName = new Map(catalog.map((s) => [s.name, s]));

function statusFor(type: SkillType): SkillStatus {
  const r = rnd();
  if (type === 'UC Skill') return r < 0.1 ? 'Under Review' : r < 0.14 ? 'Sandbox' : 'Certified';
  return r < 0.08 ? 'Under Review' : r < 0.12 ? 'Sandbox' : 'Certified';
}

function describe(name: string, type: SkillType): string {
  const n = name.replace(/\s*\(.*?\)/g, '');
  switch (type) {
    case 'UC Skill':
      return `How to apply ${n.toLowerCase()} the GSK way: steps, rules, and what must be flagged for a person.`;
    case 'UC Function':
      return `Governed function ${n}. Returns only what the caller is granted to see.`;
    case 'MCP Service':
      return `Governed connection to ${n}, exposed as MCP tools with per-agent grants.`;
    case 'Genie Agent':
      return `Natural-language questions over curated ${n.replace(/ Genie| Agent|\(Vertex AI\)/g, '').trim()} data.`;
    default:
      return `Cited answers from the ${n} document set.`;
  }
}

function addEntry(name: string, type: SkillType, d: DomainDef, runsOn?: string): Skill {
  const existing = byName.get(name);
  if (existing) return existing;
  const id = slug(name);
  const status = statusFor(type);
  const usage = status === 'Certified' ? int(40, 6000) : int(0, 30);
  const entry: Skill = {
    id,
    name,
    type,
    domain: d.name,
    owner: pick(d.owners),
    gxpTier: (d.gxp ? pick(['Tier 1', 'Tier 2']) : pick(['Tier 2', 'Tier 3'])) as GxpTier,
    status,
    version: type === 'Genie Agent' || type === 'Knowledge Assistant' ? `v${int(1, 4).toString()}.${int(0, 9).toString()}` : `v${int(0, 3).toString()}.${int(0, 9).toString()}`,
    ucPath: `${d.id.replace('-', '_')}.${type === 'UC Skill' ? 'skills' : type === 'UC Function' ? 'functions' : 'services'}.${id.replace(/-/g, '_')}`,
    description: describe(name, type),
    inputs: type === 'UC Skill' ? 'task context' : 'arguments per tool schema',
    outputs: type === 'UC Skill' ? 'structured findings' : 'JSON records',
    lastUsed: usage === 0 ? 'never' : pick(['2 min ago', '14 min ago', '1 hr ago', 'today', 'yesterday']),
    usageCount: usage,
    runsOn: type === 'UC Skill' ? undefined : runsOn,
  };
  catalog.push(entry);
  byName.set(name, entry);
  return entry;
}

// ── Build per domain ───────────────────────────────────────────────────────────
export interface DataAsset {
  id: string;
  name: string;
  ref: string;
  domainId: string;
}
export interface RoleAgent {
  id: string;
  name: string;
  podId: string;
  domainId: string;
  skills: string[];
  tools: string[];
  calls: string[];
  servicePrincipal: string;
  model: string;
  runs30d: number;
}
export interface PodDef extends Pod {
  domainId: string;
  agentIds: string[];
  capabilityIds: string[];
  cost30d: number;
}

const dataAssets: DataAsset[] = [];
const capabilities: Capability[] = [];
const pods: PodDef[] = [];
const roleAgents: RoleAgent[] = [];

const FLAGSHIP_DATA: Record<string, string> = { 'Clinical trial results': 'd-clinical', 'Regulatory history': 'd-regulatory', 'Deviations & batch release': 'd-quality' };

function trend(total: number): number[] {
  const base = total / 30;
  return Array.from({ length: 30 }, (_, i) => {
    const weekday = i % 7 === 5 || i % 7 === 6 ? 0.35 : 1;
    return Math.max(0, Math.round(base * weekday * between(0.6, 1.4)));
  });
}

const SNIPPET_TEMPLATES: ((d: DomainDef, cap: string, data: string) => OntologySnippet)[] = [
  (d, _c, data) => ({ kind: 'Metric definition', text: `“${data}” counts only records with an approved status in the system of record.`, origin: 'Curated', source: `Metric view · ${d.id.replace('-', '_')}.semantic.${slug(data).replace(/-/g, '_')}_mv`, authority: between(0.88, 0.97) }),
  (d, cap) => ({ kind: 'Business rule', text: `For “${cap.toLowerCase()}”, anything outside ${d.short.toLowerCase()} policy thresholds is escalated to a named owner.`, origin: 'Curated', source: `UC Page · ${d.short} glossary`, authority: between(0.85, 0.96) }),
  (d, _c, data) => ({ kind: 'Authoritative source', text: `Questions about ${data.toLowerCase()} are answered from the certified ${d.short} Genie Agent.`, origin: 'Inferred', source: 'Genie Agent usage', authority: between(0.7, 0.85) }),
];

for (const seed of SEEDS) {
  const d = domainById(seed.id);
  const skills = seed.skills.map((n) => addEntry(n, 'UC Skill', d));
  const tools = seed.tools.map(([n, t, on]) => addEntry(n, t, d, on));
  const platformAgents = seed.platformAgents.map(([n, t, on]) => addEntry(n, t, d, on));
  const data = seed.data.map(([name, ref]) => {
    const asset = { id: FLAGSHIP_DATA[name] ?? `d-${slug(name)}`, name, ref, domainId: d.id };
    dataAssets.push(asset);
    return asset;
  });

  const domainPods: PodDef[] = seed.pods.map(([id, name], p) => {
    const existing = SEED_PODS.find((x) => x.id === id);
    const status = existing?.status ?? (rnd() < 0.12 ? 'Sandbox' : 'Active');
    return {
      id,
      name,
      domain: d.name,
      domainId: d.id,
      owner: existing?.owner ?? pick(d.owners),
      autonomyTier: existing?.autonomyTier ?? `${d.tier} · ${d.tier === 'Tier 1' ? 'human-in-the-loop' : d.tier === 'Tier 2' ? 'human-on-the-loop' : 'assistive'}`,
      status,
      version: existing?.version ?? `v${int(1, 2).toString()}.${int(0, 6).toString()}`,
      summary: existing?.summary ?? '',
      agentNames: [],
      lastRun: existing?.lastRun ?? pick(['4 min ago', '1 hr ago', 'today', 'yesterday']),
      avgCostPerRun: existing?.avgCostPerRun ?? Number(between(0.05, 1.9).toFixed(2)),
      runsThisMonth: existing?.runsThisMonth ?? 0,
      demoReady: id === SRP_ID,
      agentIds: [],
      capabilityIds: seed.caps.filter((_, i) => seed.capPod[i] === p).map(([cid]) => cid),
      cost30d: 0,
    };
  });
  pods.push(...domainPods);

  seed.caps.forEach(([id, name], i) => {
    if (id === SRA_ID) {
      capabilities.push(FLAGSHIP);
      return;
    }
    const capSkills = [skills[(i * 2) % skills.length], skills[(i * 2 + 1) % skills.length]];
    if (rnd() < 0.5) capSkills.push(skills[10 + (i % 2)]);
    const capTools = [tools[i % tools.length]];
    if (rnd() < 0.55) capTools.push(tools[(i + 3) % tools.length]);
    const capData = [data[i % data.length]];
    if (rnd() < 0.5) capData.push(data[(i + 1) % data.length]);
    const links: [string, string][] = [];
    capSkills.forEach((s, k) => {
      const t = capTools[k];
      if (t) {
        links.push([s.id, t.id]);
        const dd = capData[k] ?? capData[0];
        links.push([t.id, dd.id]);
      } else links.push([s.id, capData[k % capData.length].id]);
    });
    const runs = int(15, 640);
    const hasExternal = platformAgents.some((s) => s.runsOn?.startsWith('GCP'));
    const hasMcp = capTools.some((t) => t.type === 'MCP Service');
    const status: Capability['status'] = rnd() < 0.08 ? 'Draft' : 'Live';
    capabilities.push({
      id,
      name,
      domain: d.name,
      domainId: d.id,
      owner: pick(d.owners),
      status,
      podId: domainPods[seed.capPod[i]].id,
      gxp: d.gxp,
      deps: ['uc-skills', 'uc-functions', 'genie-agents', 'genie-ontology', 'appkit-agents', 'ai-gateway', 'mlflow-tracing', ...(hasMcp ? ['mcp-services'] : []), ...(hasExternal && i % 2 === 0 ? ['external-agents'] : []), ...(rnd() < 0.4 ? ['prod-monitoring'] : [])],
      version: `v1.${int(0, 6).toString()}`,
      hasCandidate: rnd() < 0.2,
      runs30d: status === 'Draft' ? 0 : runs,
      successRate: Number(between(0.84, 0.99).toFixed(2)),
      costPerRun: Number(between(0.05, 1.9).toFixed(2)),
      reviewerMin: int(3, 26),
      trend: status === 'Draft' ? Array.from({ length: 30 }, () => 0) : trend(runs),
      sampleRequest: `${name} for ${d.context[0].toLowerCase()} ${pick(['A', 'B', 'C'])}-${int(100, 999).toString()}. Flag anything that needs my attention.`,
      skills: capSkills.map((s) => s.id),
      tools: capTools.map((t) => t.id),
      links,
      data: capData.map((x) => ({ ...x, via: '', readBy: [] })),
      context: d.context.map((k) => ({ key: k, value: k === 'User' ? `${pick(d.owners)} lead` : `${k} ${pick(['A', 'B', 'C'])}-${int(10, 99).toString()}` })),
      ontology: SNIPPET_TEMPLATES.map((f) => f(d, name, capData[0].name)).map((o) => ({ ...o, authority: Number(o.authority.toFixed(2)) })),
      controls: [
        { declared: 'Read-only on source data', enforcedBy: 'Unity Catalog grants' },
        { declared: `${d.tier === 'Tier 3' ? 'User reviews' : 'Named owner signs off on'} the result`, enforcedBy: 'Approval gate' },
        { declared: 'Every claim cites a source', enforcedBy: 'MLflow scorer' },
        { declared: `Max $${(between(0.5, 3)).toFixed(2)} per run`, enforcedBy: 'AI Gateway budget' },
      ],
      checks: [
        { name: 'Citations', target: '100% of claims' },
        { name: 'Completeness', target: 'all required sections' },
        { name: 'Correctness', target: '≥ 0.90 vs expert answer' },
      ],
    });
  });

  // GSK-built agents: one per skill used by the pod's capabilities, plus a drafter.
  for (const pod of domainPods) {
    if (pod.id === SRP_ID) {
      for (const a of SRP_AGENTS) {
        roleAgents.push({ id: a.id, name: a.name, podId: SRP_ID, domainId: d.id, skills: a.skills, tools: a.tools, calls: a.calls, servicePrincipal: a.servicePrincipal, model: a.model, runs30d: 37 });
        pod.agentIds.push(a.id);
      }
      pod.agentNames = SRP_AGENTS.map((a) => a.name);
      pod.runsThisMonth = 37;
      pod.cost30d = 37 * pod.avgCostPerRun;
      continue;
    }
    const caps = capabilities.filter((c) => pod.capabilityIds.includes(c.id));
    const podSkills = [...new Set(caps.flatMap((c) => c.skills))].slice(0, 4);
    const podTools = [...new Set(caps.flatMap((c) => c.tools))];
    const runs = caps.reduce((s, c) => s + c.runs30d, 0);
    podSkills.forEach((skillId, k) => {
      const skill = catalog.find((s) => s.id === skillId);
      const words = (skill?.name ?? 'Task').replace(/\s*\(.*?\)/g, '').split(' ');
      const name = `${words.slice(0, words.length > 2 ? 2 : words.length).join(' ')} Agent`;
      const agent: RoleAgent = {
        id: `${pod.id}--${slug(name)}`,
        name,
        podId: pod.id,
        domainId: d.id,
        skills: [skillId],
        tools: podTools[k] ? [podTools[k]] : [],
        calls: rnd() < 0.6 ? [platformAgents[k % platformAgents.length].id] : [],
        servicePrincipal: `sp-${d.id.slice(0, 3)}-${slug(name).slice(0, 4)}-${int(16, 255).toString(16)}`,
        model: pick(['databricks-claude-sonnet-4-6', 'databricks-claude-sonnet-4-6', 'databricks-gpt-5-5']),
        runs30d: runs,
      };
      roleAgents.push(agent);
      pod.agentIds.push(agent.id);
    });
    const drafter: RoleAgent = {
      id: `${pod.id}--drafter`,
      name: `${d.short} Drafter`,
      podId: pod.id,
      domainId: d.id,
      skills: [skills[11].id],
      tools: [],
      calls: [],
      servicePrincipal: `sp-${d.id.slice(0, 3)}-drft-${int(16, 255).toString(16)}`,
      model: 'databricks-claude-sonnet-4-6',
      runs30d: runs,
    };
    roleAgents.push(drafter);
    pod.agentIds.push(drafter.id);
    pod.agentNames = pod.agentIds.map((aid) => roleAgents.find((a) => a.id === aid)?.name ?? aid);
    pod.runsThisMonth = runs;
    pod.cost30d = runs * pod.avgCostPerRun;
    pod.summary = caps.map((c) => c.name).join(' · ');
  }
}

// Post-pass: record Databricks-agent dependencies from what each pod's agents actually call.
for (const c of capabilities) {
  if (c.id === SRA_ID || !c.podId) continue;
  const called = roleAgents.filter((a) => a.podId === c.podId).flatMap((a) => a.calls.map((id) => catalog.find((s) => s.id === id)));
  if (called.some((s) => s?.type === 'Knowledge Assistant') && !c.deps.includes('knowledge-assistant')) c.deps.push('knowledge-assistant');
  if (called.some((s) => s?.runsOn?.startsWith('GCP')) && !c.deps.includes('external-agents')) c.deps.push('external-agents');
}

export const CATALOG: Skill[] = catalog;
export const DATA_ASSETS: DataAsset[] = dataAssets;
export const CAPABILITIES: Capability[] = capabilities;
export const POD_LIST: PodDef[] = pods;
export const ROLE_AGENTS: RoleAgent[] = roleAgents;

export const capabilityById = (id: string) => CAPABILITIES.find((c) => c.id === id);
export const podById = (id: string) => POD_LIST.find((p) => p.id === id);
export const roleAgentById = (id: string) => ROLE_AGENTS.find((a) => a.id === id);
export const dataById = (id: string) => DATA_ASSETS.find((x) => x.id === id);

// Which capabilities and agents use a catalog entry.
export function usage(entryId: string): { capabilities: Capability[]; agents: RoleAgent[] } {
  return {
    capabilities: CAPABILITIES.filter((c) => c.skills.includes(entryId) || c.tools.includes(entryId)),
    agents: ROLE_AGENTS.filter((a) => a.skills.includes(entryId) || a.tools.includes(entryId) || a.calls.includes(entryId)),
  };
}

export function gxpHold(c: Capability): string[] {
  if (!c.gxp) return [];
  return c.deps.filter((id) => PLATFORM.find((p) => p.id === id)?.status !== 'GA');
}

// ── Operations: daily runs, work items, triggers, denials ──────────────────────
export const DAYS = Array.from({ length: 30 }, (_, i) => {
  const dt = new Date(2026, 7, 26 + i);
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
});

export function dailyRuns(domainId: string): number[] {
  const caps = CAPABILITIES.filter((c) => domainId === 'all' || c.domainId === domainId);
  return DAYS.map((_, i) => caps.reduce((s, c) => s + c.trend[i], 0));
}

export type WorkKind = 'Request' | 'Human task' | 'Trigger run';
export interface WorkItem {
  id: string;
  kind: WorkKind;
  title: string;
  capabilityId: string;
  podId: string;
  domainId: string;
  status: 'Running' | 'Needs sign-off' | 'Waiting on a person' | 'Open' | 'Done';
  owner: string;
  tier: string;
  due: string;
  blocks?: string;
  cost: number;
}

const HUMAN_TASKS: Record<string, string[]> = {
  'rd-clin': ['Confirm site list for ZOS-401', 'Unblind check for DSMB pack'],
  'rd-reg': ['Answer HA question 14 (clinical)', 'Approve label wording change'],
  quality: ['Close DEV-2311 before batch release', 'Sign CAPA-0922 effectiveness check'],
  supply: ['Approve allocation for EU shortfall', 'Confirm alternate supplier'],
  mfg: ['Review OOS result, line 3', 'Approve maintenance window'],
  commercial: ['MLR review for wave 4 email', 'Approve journey for DE launch'],
  medical: ['Medical review of response SRL-231', 'Confirm advisory board attendees'],
  enterprise: ['Approve access for new hire', 'Legal review of clause 12.3'],
};

const workItems: WorkItem[] = [
  {
    id: 'HT-201',
    kind: 'Human task',
    title: 'Close DEV-2291 on the fill-finish line',
    capabilityId: SRA_ID,
    podId: SRP_ID,
    domainId: 'rd-reg',
    status: 'Open',
    owner: 'QA Lead · Wavre',
    tier: 'Tier 2',
    due: '14 Oct',
    blocks: 'Filing for GSK-2894512',
    cost: 0,
  },
];
let seq = 1100;
for (const c of CAPABILITIES) {
  if (c.status === 'Draft' || !c.podId) continue;
  const pod = podById(c.podId);
  const d = domainById(c.domainId);
  const n = int(0, 2);
  for (let k = 0; k < n; k++) {
    seq += 1;
    workItems.push({
      id: `WR-${seq.toString()}`,
      kind: rnd() < 0.3 ? 'Trigger run' : 'Request',
      title: `${c.name} · ${d.context[0]} ${pick(['A', 'B', 'C'])}-${int(100, 999).toString()}`,
      capabilityId: c.id,
      podId: c.podId,
      domainId: c.domainId,
      status: pick(['Running', 'Needs sign-off', 'Needs sign-off', 'Done', 'Done', 'Waiting on a person']),
      owner: pick(d.owners),
      tier: pod?.autonomyTier.split(' · ')[0] ?? d.tier,
      due: pick(['today', 'tomorrow', 'this week', '—']),
      cost: Number((c.costPerRun * between(0.8, 1.2)).toFixed(2)),
    });
  }
}
for (const d of DOMAINS) {
  for (const t of HUMAN_TASKS[d.id]) {
    const c = pick(CAPABILITIES.filter((x) => x.domainId === d.id && x.podId));
    seq += 1;
    workItems.push({
      id: `HT-${seq.toString()}`,
      kind: 'Human task',
      title: t,
      capabilityId: c.id,
      podId: c.podId ?? '',
      domainId: d.id,
      status: 'Open',
      owner: pick(d.owners),
      tier: d.tier,
      due: pick(['today', 'tomorrow', 'this week']),
      blocks: `${c.name} run`,
      cost: 0,
    });
  }
}
export const WORK_ITEMS: WorkItem[] = workItems;

export interface Trigger {
  id: string;
  kind: 'Event' | 'Schedule';
  when: string;
  source: string;
  capabilityId: string;
  fires30d: number;
  lastFired: string;
}
const TRIGGER_SEEDS: [Trigger['kind'], string, string, string][] = [
  ['Event', 'Deviation closed', 'QMS', SRA_ID],
  ['Event', 'New HA letter received', 'RIM', 'answer-ha-query'],
  ['Event', 'Enrollment below plan for 2 weeks', 'CTMS', 'monitor-site-enrollment'],
  ['Event', 'Batch record complete', 'MES', 'review-batch-record'],
  ['Event', 'Stability timepoint posted', 'LIMS', 'summarise-stability-data'],
  ['Event', 'Stock below safety level', 'SAP IBP', 'forecast-demand-shortfall'],
  ['Event', 'Campaign brief approved', 'PromoMats', 'plan-omnichannel-journey'],
  ['Event', 'Medical information request received', 'Medical CRM', 'answer-med-info-request'],
  ['Event', 'P1 incident opened', 'ServiceNow', 'triage-it-incident'],
  ['Schedule', 'Every Monday 07:00', 'Scheduler', 'trend-complaints'],
  ['Schedule', 'Close day 2, 06:00', 'Scheduler', 'reconcile-finance-close'],
  ['Schedule', 'Weekly, Friday 16:00', 'Scheduler', 'track-kol-insights'],
];
export const TRIGGERS: Trigger[] = TRIGGER_SEEDS.map(([kind, when, source, capabilityId], i) => ({
  id: `TR-${(i + 1).toString().padStart(2, '0')}`,
  kind,
  when,
  source,
  capabilityId,
  fires30d: int(2, 60),
  lastFired: pick(['12 min ago', '2 hr ago', 'today 07:00', 'yesterday', '3 days ago']),
}));

export interface Denial {
  id: string;
  when: string;
  agent: string;
  pod: string;
  domainId: string;
  resource: string;
  reason: string;
}
const REASONS = ['Not in agent grants', 'Uncertified tool blocked', 'Budget cap reached', 'Row filter: other site'];
export const DENIALS: Denial[] = Array.from({ length: 42 }, (_, i) => {
  const a = pick(ROLE_AGENTS);
  const pod = podById(a.podId);
  const asset = pick(DATA_ASSETS);
  return {
    id: `DN-${(i + 1).toString()}`,
    when: `${int(1, 29).toString()} days ago`,
    agent: a.name,
    pod: pod?.name ?? a.podId,
    domainId: a.domainId,
    resource: asset.ref.split(' ')[0],
    reason: pick(REASONS),
  };
});
DENIALS.unshift({ id: 'DN-0', when: 'today', agent: 'Quality Review Agent', pod: 'Submission Readiness Pod', domainId: 'rd-reg', resource: 'manufacturing.batch_genealogy', reason: 'Not in agent grants' });

// ── One kind of agent ─────────────────────────────────────────────────────────
// Every agent is a pod member. GSK-built agents get their know-how from skills; Databricks agents
// (Genie Agents, Knowledge Assistants) and external agents (Vertex AI) come ready-made.
export type BuiltBy = 'GSK' | 'Databricks' | 'External';
export function builtBy(s: Skill): BuiltBy {
  return s.runsOn?.startsWith('GCP') ? 'External' : 'Databricks';
}
export function agentKind(s: Skill): string {
  return builtBy(s) === 'External' ? 'Vertex AI agent' : s.type;
}
export function podPlatformAgents(p: PodDef): Skill[] {
  const ids = [...new Set(p.agentIds.flatMap((id) => roleAgentById(id)?.calls ?? []))];
  return ids.map((id) => CATALOG.find((s) => s.id === id)).filter((s) => s !== undefined);
}
export function podMemberCount(p: PodDef): number {
  return p.agentIds.length + podPlatformAgents(p).length;
}

export interface AgentRow {
  id: string;
  name: string;
  builtBy: BuiltBy;
  kind: string;
  podIds: string[];
  domainId: string;
  runs: number;
  status: string;
  role?: RoleAgent;
}
const PLATFORM_AGENT_ENTRIES = CATALOG.filter((s) => s.type === 'Genie Agent' || s.type === 'Knowledge Assistant');
export const ALL_AGENTS: AgentRow[] = [
  ...ROLE_AGENTS.map((a) => ({ id: a.id, name: a.name, builtBy: 'GSK' as const, kind: 'Skills-based', podIds: [a.podId], domainId: a.domainId, runs: a.runs30d, status: 'Certified', role: a })),
  ...PLATFORM_AGENT_ENTRIES.map((s) => {
    const pods = POD_LIST.filter((p) => podPlatformAgents(p).some((x) => x.id === s.id));
    return {
      id: s.id,
      name: s.name,
      builtBy: builtBy(s),
      kind: agentKind(s),
      podIds: pods.map((p) => p.id),
      domainId: DOMAINS.find((d) => d.name === s.domain)?.id ?? '',
      runs: s.usageCount,
      status: s.status,
    };
  }),
];

// Snapshot counts for headers.
export const ESTATE_COUNTS = {
  domains: DOMAINS.length,
  capabilities: CAPABILITIES.length,
  skills: CATALOG.filter((s) => s.type === 'UC Skill').length,
  tools: CATALOG.filter((s) => s.type === 'UC Function' || s.type === 'MCP Service').length,
  platformAgents: CATALOG.filter((s) => s.type === 'Genie Agent' || s.type === 'Knowledge Assistant').length,
  pods: POD_LIST.length,
  roleAgents: ROLE_AGENTS.length,
  agents: ROLE_AGENTS.length + PLATFORM_AGENT_ENTRIES.length,
  data: DATA_ASSETS.length,
};

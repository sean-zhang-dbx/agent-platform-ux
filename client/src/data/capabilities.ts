// A capability = skills (how) + data (evidence) + context (the situation), with declared controls
// that the platform enforces independently. Data and context are referenced, never copied.

export interface CapabilityControl {
  declared: string;
  enforcedBy: string;
}

// Genie Ontology snippet (Public Preview): curated from UC semantics (metric views, domains, Pages)
// or inferred from dashboards, SQL queries and Genie Agents; each has an authority score.
export interface OntologySnippet {
  kind: 'Business rule' | 'Metric definition' | 'Authoritative source';
  text: string;
  origin: 'Curated' | 'Inferred';
  source: string;
  authority: number;
}

// One object a source draws from: a lakehouse table, a metric view, a Confluence space, a graph model.
export interface ContextItem {
  name: string; // table path, doc source or model name
  via: string; // 'table' | 'metric view' | 'Confluence' | 'SharePoint' | 'graph'
}

// A semantic source in the Semantic Kernel. Every pod agent reaches these through Genie One (MCP),
// which is the single context layer across agents, cloud and systems — not by wiring to each directly.
export interface ContextSource {
  id: string;
  lane: 'Lakehouse' | 'Regulated' | 'Collaboration';
  name: string; // e.g. 'Genie Ontology', 'Stardog', 'Glean'
  items: ContextItem[]; // the actual objects this source draws from for this capability
}

// Agentic memory persisted across runs in Lakebase (serverless Postgres).
export interface MemoryLayer {
  store: string; // 'Lakebase'
  note: string; // one line: what it remembers between runs
}

export interface Capability {
  id: string;
  name: string;
  domain: string; // display name
  domainId: string;
  owner: string;
  status: 'Live' | 'Draft';
  inReview?: boolean; // submitted for certification from the composer
  podId?: string;
  gxp: boolean;
  deps: string[]; // platform building blocks (see PLATFORM in estate.ts)
  version: string;
  hasCandidate: boolean;
  runs30d: number;
  successRate: number;
  costPerRun: number;
  reviewerMin: number;
  trend: number[]; // daily runs, last 30 days
  sampleRequest: string;
  skills: string[];
  tools: string[];
  links: [string, string][]; // skill → tool, skill → data, tool → data
  data: { id: string; name: string; ref: string; via: string; readBy: string[] }[];
  context: { key: string; value: string }[];
  contextSources?: ContextSource[]; // Semantic Kernel sources reached through Genie One (MCP)
  memory?: MemoryLayer; // agentic memory persisted in Lakebase
  ontology: OntologySnippet[];
  controls: CapabilityControl[];
  checks: { name: string; target: string }[];
}

export const SRA_ID = 'assess-submission-readiness';

export const FLAGSHIP: Capability = {
    id: SRA_ID,
    name: 'Author a submission dossier',
    domain: 'R&D Regulatory',
    domainId: 'rd-reg',
    owner: 'Global Regulatory Affairs',
    status: 'Live',
    podId: 'submission-readiness',
    gxp: true,
    deps: ['uc-skills', 'uc-functions', 'genie-agents', 'knowledge-assistant', 'genie-ontology', 'appkit-agents', 'ai-gateway', 'mlflow-tracing', 'prod-monitoring'],
    version: 'v1.3',
    hasCandidate: true,
    runs30d: 37,
    successRate: 0.94,
    costPerRun: 0.42,
    reviewerMin: 18,
    trend: [0, 1, 2, 1, 0, 0, 2, 3, 1, 2, 1, 0, 0, 1, 2, 2, 3, 1, 0, 0, 2, 1, 2, 3, 2, 0, 0, 1, 2, 1],
    sampleRequest:
      'Author the submission dossier for compound NWP-2894512 (adult vaccine booster, Phase III complete, database locked). Draft the CSR clinical summary and efficacy/safety sections from the locked data, check labelling and cross-section consistency, draft first-pass responses to the likely health-authority questions from our prior Q&A, and assemble the eCTD Module 2. Cite every claim and flag anything that needs my call before I sign off.',
    skills: ['csr-section-authoring', 'ha-query-response-drafting', 'labeling-consistency-check', 'ectd-module-mapping'],
    tools: ['get-clinical-summary', 'save-csr-draft', 'label-text-diff', 'save-report-draft'],
    links: [
      ['csr-section-authoring', 'get-clinical-summary'],
      ['get-clinical-summary', 'd-clinical'],
      ['csr-section-authoring', 'save-csr-draft'],
      ['ha-query-response-drafting', 'd-regulatory'],
      ['labeling-consistency-check', 'label-text-diff'],
      ['label-text-diff', 'd-quality'],
      ['ectd-module-mapping', 'save-report-draft'],
    ],
    data: [
      { id: 'd-clinical', name: 'Locked clinical data', ref: 'demo.pharma.clinical_trials, trial_endpoints', via: 'Clinical Trials Genie Agent', readBy: ['get-clinical-summary', 'clinical-trials-genie'] },
      { id: 'd-regulatory', name: 'Prior submissions & HA Q&A', ref: 'demo.pharma.regulatory_docs (prior CSRs, HA letters)', via: 'Regulatory Document Corpus', readBy: ['regulatory-corpus-ka'] },
      { id: 'd-quality', name: 'Approved labelling', ref: 'rd_reg.docs.labels', via: 'label_text_diff', readBy: ['label-text-diff'] },
    ],
    context: [
      { key: 'Study', value: 'NWV-301 · 302 · 305' },
      { key: 'Phase', value: 'III complete · DB locked' },
      { key: 'Jurisdiction', value: 'FDA (US)' },
      { key: 'User', value: 'RA Lead · Vaccines' },
    ],
    ontology: [
      {
        kind: 'Business rule',
        text: 'Every efficacy figure in the CSR must trace to a locked endpoint row, never an interim readout.',
        origin: 'Curated',
        source: 'UC Page · CSR authoring standard',
        authority: 0.96,
      },
      {
        kind: 'Metric definition',
        text: 'Vaccine efficacy = 1 − (attack rate vaccinated ÷ attack rate placebo), per-protocol population.',
        origin: 'Curated',
        source: 'Metric view · rd.clinical.trial_endpoints_mv',
        authority: 0.93,
      },
      {
        kind: 'Authoritative source',
        text: 'A health-authority question reuses the approved prior answer when it matches; HAQ&R finds it before anything new is drafted.',
        origin: 'Inferred',
        source: 'Genie Agent usage · prior Q&A',
        authority: 0.84,
      },
      {
        kind: 'Business rule',
        text: '“Phase III complete” means database lock is recorded, not last patient visit.',
        origin: 'Inferred',
        source: 'SQL queries',
        authority: 0.72,
      },
    ],
    controls: [
      { declared: 'Read-only on clinical and prior-submission data', enforcedBy: 'Unity Catalog grants' },
      { declared: 'No blinded or patient-level records', enforcedBy: 'Unity Catalog grants · denials logged' },
      { declared: 'RA lead signs off before anything is filed', enforcedBy: 'Approval gate' },
      { declared: 'Every drafted claim cites a source', enforcedBy: 'MLflow scorer' },
      { declared: 'Max $1.00 per run', enforcedBy: 'AI Gateway budget' },
    ],
    checks: [
      { name: 'Citations', target: '100% of drafted claims' },
      { name: 'Completeness', target: 'CSR + Module 2 sections' },
      { name: 'Consistency', target: 'labelling matches source' },
      { name: 'Approved sources only', target: 'no uncertified data' },
    ],
  };

// Second hero: a continuous, operational capability. Unlike the dossier (a one-shot authored artifact),
// this runs 24/7 against a stream of tickets, resolving the safe ones and escalating the rest.
export const ITSM_ID = 'triage-it-incident';

export const ITSM_CAP: Capability = {
  id: ITSM_ID,
  name: 'Resolve or route an IT incident',
  domain: 'Enterprise Functions',
  domainId: 'enterprise',
  owner: 'IT Service Management',
  status: 'Live',
  podId: 'it-service',
  gxp: false,
  deps: ['uc-skills', 'uc-functions', 'mcp-services', 'knowledge-assistant', 'genie-ontology', 'appkit-agents', 'ai-gateway', 'mlflow-tracing', 'prod-monitoring'],
  version: 'v2.1',
  hasCandidate: true,
  runs30d: 4218,
  successRate: 0.93,
  costPerRun: 0.04,
  reviewerMin: 2,
  trend: [150, 145, 60, 55, 150, 160, 148, 152, 140, 58, 52, 150, 155, 149, 160, 145, 55, 58, 152, 148, 151, 159, 143, 60, 54, 150, 156, 150, 158, 146],
  sampleRequest:
    'INC0048213 — “VPN keeps dropping every few minutes on my laptop after the latest client update.” Priority 3, raised via the self-service portal. Triage it against the CMDB and known errors, resolve it if it is a safe, known fix, otherwise escalate to the right team with everything you found.',
  skills: ['incident-triage-classification', 'knowledge-resolution', 'runbook-automation', 'escalation-decision'],
  tools: ['servicenow', 'get-cmdb-ci', 'run-runbook'],
  links: [
    ['incident-triage-classification', 'servicenow'],
    ['servicenow', 'd-incidents'],
    ['incident-triage-classification', 'get-cmdb-ci'],
    ['get-cmdb-ci', 'd-cmdb'],
    ['runbook-automation', 'run-runbook'],
    ['escalation-decision', 'servicenow'],
  ],
  data: [
    { id: 'd-incidents', name: 'IT incidents', ref: 'corp.it.incidents', via: 'ServiceNow (MCP)', readBy: ['servicenow'] },
    { id: 'd-cmdb', name: 'CMDB configuration items', ref: 'corp.it.cmdb_ci', via: 'get_cmdb_ci', readBy: ['get-cmdb-ci'] },
  ],
  context: [
    { key: 'Ticket', value: 'INC0048213' },
    { key: 'Priority', value: 'P3 · portal' },
    { key: 'Config item', value: 'Laptop · VPN client' },
    { key: 'Requester', value: 'End user · Sales' },
  ],
  ontology: [
    {
      kind: 'Business rule',
      text: 'A ticket auto-resolves only when the fix is known, reversible, and triage confidence ≥ 0.90; otherwise it escalates to a person.',
      origin: 'Curated',
      source: 'UC Page · IT resolution policy',
      authority: 0.95,
    },
    {
      kind: 'Authoritative source',
      text: 'Known fixes come from the certified IT Knowledge Base, never from an individual agent’s memory.',
      origin: 'Curated',
      source: 'Genie Ontology · Knowledge Base',
      authority: 0.9,
    },
    {
      kind: 'Business rule',
      text: 'Anything touching a production CI or a non-reversible change is escalated regardless of confidence.',
      origin: 'Inferred',
      source: 'Change & SoD policy',
      authority: 0.83,
    },
  ],
  controls: [
    { declared: 'Read-only on CMDB and incident data; writes only via ServiceNow, least privilege', enforcedBy: 'MCP services · ABAC grants' },
    { declared: 'Auto-resolve only known, reversible fixes', enforcedBy: 'Policy gate' },
    { declared: 'Escalate on low confidence or production impact', enforcedBy: 'Escalation gate' },
    { declared: 'Every action written back to the ticket with the evidence used', enforcedBy: 'Audit trail' },
    { declared: 'Max $0.20 per ticket', enforcedBy: 'AI Gateway budget' },
  ],
  checks: [
    { name: 'Auto-resolve precision', target: '≥ 0.95 (no reopen 72h)' },
    { name: 'Reopen rate', target: '< 5% within 72h' },
    { name: 'Escalations carry a full summary', target: '100%' },
    { name: 'Approved KB sources only', target: 'no uncertified fixes' },
  ],
};

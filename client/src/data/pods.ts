import type { AgentId, Pod, PodAgent } from './types';

export const SRP_ID = 'submission-readiness';

export const PODS: Pod[] = [
  {
    id: SRP_ID,
    name: 'Submission Dossier Pod',
    domain: 'R&D',
    owner: 'Regulatory Affairs · Vaccines',
    autonomyTier: 'Tier 2 · human-on-the-loop',
    status: 'Active',
    version: 'v1.3',
    summary: 'Turns a locked clinical dataset into a submission dossier: drafts the CSR sections, checks labelling and consistency, drafts first-pass HA responses from prior Q&A, and assembles the eCTD — draft only, the RA lead signs off.',
    agentNames: ['CSR Author Agent', 'HA-Response Agent', 'QC & Consistency Agent', 'eCTD Assembler'],
    lastRun: 'Yesterday, 16:12',
    avgCostPerRun: 0.42,
    runsThisMonth: 37,
    demoReady: true,
  },
  {
    id: 'csr-authoring',
    name: 'CSR Authoring Pod',
    domain: 'R&D',
    owner: 'Clinical Operations',
    autonomyTier: 'Tier 1 · human-in-the-loop',
    status: 'Sandbox',
    version: 'v0.6',
    summary: 'Drafts clinical study report sections from locked datasets, section by section, with a medical writer approving each one.',
    agentNames: ['CSR Author Agent', 'Submissions Plan Agent', 'CSR Drafting Agent'],
    lastRun: '3 days ago',
    avgCostPerRun: 1.85,
    runsThisMonth: 6,
    demoReady: false,
  },
  {
    id: 'omnichannel',
    name: 'Omnichannel Content Pod',
    domain: 'Commercial',
    owner: 'Commercial Excellence',
    autonomyTier: 'Tier 1 · human-in-the-loop',
    status: 'Active',
    version: 'v2.1',
    summary: 'Builds channel-ready content from approved claims and checks it before MLR review.',
    agentNames: ['Content & MLR Agent', 'Omnichannel Agent', 'Journey Agent'],
    lastRun: '26 min ago',
    avgCostPerRun: 0.31,
    runsThisMonth: 212,
    demoReady: false,
  },
  {
    id: 'business-companion',
    name: 'Business Companion Pod',
    domain: 'Business',
    owner: 'Enterprise AI',
    autonomyTier: 'Tier 3 · assistive',
    status: 'Active',
    version: 'v1.0',
    summary: 'End-user helpers: research questions, data questions, and SOP lookups.',
    agentNames: ['Genie Researcher', 'Genie Data Companion', 'SOP & Policy Navigator'],
    lastRun: '2 min ago',
    avgCostPerRun: 0.04,
    runsThisMonth: 4810,
    demoReady: false,
  },
];

export const SRP_AGENTS: PodAgent[] = [
  {
    id: 'clinical',
    name: 'CSR Author Agent',
    role: 'Drafts the CSR clinical summary and efficacy/safety sections from the locked trial data.',
    servicePrincipal: 'sp-rd-clin-7f3a',
    skills: ['csr-section-authoring'],
    tools: ['get-clinical-summary', 'save-csr-draft'],
    calls: ['clinical-trials-genie'],
    can: ['Read locked clinical tables (read-only)', 'Draft CSR sections with every figure cited'],
    cannot: ['Modify any data', 'Read blinded or patient-level records'],
    model: 'databricks-claude-sonnet-4-6',
    avgTokens: 18400,
    avgCost: 0.09,
  },
  {
    id: 'regintel',
    name: 'HA-Response Agent',
    role: 'Drafts first-pass responses to the likely health-authority questions from prior Q&A.',
    servicePrincipal: 'sp-rd-reg-19c2',
    skills: ['ha-query-response-drafting'],
    tools: [],
    calls: ['regulatory-corpus-ka'],
    can: ['Search prior submissions and HA Q&A (HAQ&R)', 'Reuse the approved prior answer, cited'],
    cannot: ['Fabricate an answer', 'Contact health authorities'],
    model: 'databricks-claude-sonnet-4-6',
    avgTokens: 22100,
    avgCost: 0.11,
  },
  {
    id: 'quality',
    name: 'QC & Consistency Agent',
    role: 'Checks the dossier for labelling and cross-section consistency before it goes to a person.',
    servicePrincipal: 'sp-qa-rev-5b81',
    skills: ['labeling-consistency-check'],
    tools: ['label-text-diff'],
    calls: ['clinical-trials-genie'],
    can: ['Compare drafted text against approved labelling', 'Flag numbers that disagree across sections'],
    cannot: ['Rewrite the source data', 'Read patient-level records'],
    model: 'databricks-claude-sonnet-4-6',
    avgTokens: 12900,
    avgCost: 0.06,
  },
  {
    id: 'drafter',
    name: 'eCTD Assembler',
    role: 'Places the drafted sections into the eCTD structure and writes the dossier draft.',
    servicePrincipal: 'sp-rd-draft-a44e',
    skills: ['ectd-module-mapping'],
    tools: ['save-report-draft'],
    calls: [],
    can: ['Assemble Module 2 sections', 'Write the dossier draft to the work plane'],
    cannot: ['Submit or sign the dossier', 'Make a claim without a cited source'],
    model: 'databricks-claude-sonnet-4-6',
    avgTokens: 26800,
    avgCost: 0.16,
  },
];

export const AGENT_IDS: AgentId[] = ['clinical', 'regintel', 'quality', 'drafter'];

// IT Service Desk Pod — a continuous, operational pod. Composition follows current agentic-ITSM
// practice: a triage/classifier, a knowledge/resolution agent (RAG over the KB), an automation agent
// (safe reversible runbooks), and an escalation agent that owns the auto-resolve-vs-escalate decision.
export const ITSP_ID = 'it-service';

export const ITSP_AGENTS: PodAgent[] = [
  {
    id: 'it-intake',
    name: 'Intake & Triage Agent',
    role: 'Reads the incoming ticket from ServiceNow, enriches it from the CMDB, and classifies category, priority and probable cause with a confidence score.',
    servicePrincipal: 'sp-it-triage-3c1',
    skills: ['incident-triage-classification'],
    tools: ['servicenow', 'get-cmdb-ci'],
    calls: [],
    can: ['Read incidents and the CMDB (read-only)', 'Score category, priority and confidence'],
    cannot: ['Change production state', 'Close a ticket on its own'],
    model: 'databricks-claude-sonnet-4-6',
    avgTokens: 8200,
    avgCost: 0.02,
  },
  {
    id: 'it-knowledge',
    name: 'Knowledge & Resolution Agent',
    role: 'Finds the known fix in the IT Knowledge Base and drafts a cited resolution.',
    servicePrincipal: 'sp-it-kb-7a4',
    skills: ['knowledge-resolution'],
    tools: [],
    calls: ['it-knowledge-base'],
    can: ['Search the IT Knowledge Base', 'Draft a cited resolution'],
    cannot: ['Invent a fix with no source', 'Run changes'],
    model: 'databricks-claude-sonnet-4-6',
    avgTokens: 11200,
    avgCost: 0.03,
  },
  {
    id: 'it-automation',
    name: 'Automation Agent',
    role: 'Runs the safe, reversible runbook for a known fix and updates the ticket in ServiceNow.',
    servicePrincipal: 'sp-it-auto-9f2',
    skills: ['runbook-automation'],
    tools: ['run-runbook', 'servicenow'],
    calls: [],
    can: ['Run idempotent, reversible runbooks', 'Update and resolve tickets in ServiceNow'],
    cannot: ['Run non-reversible or high-blast-radius changes', 'Touch a production CI without a human'],
    model: 'databricks-claude-sonnet-4-6',
    avgTokens: 9800,
    avgCost: 0.03,
  },
  {
    id: 'it-escalation',
    name: 'Escalation & Routing Agent',
    role: 'Applies the auto-resolve-vs-escalate decision and routes anything uncertain to the right team with a prepared summary.',
    servicePrincipal: 'sp-it-esc-2b8',
    skills: ['escalation-decision'],
    tools: ['servicenow'],
    calls: [],
    can: ['Route to the correct assignment group', 'Attach the evidence and a suggested fix'],
    cannot: ['Suppress an escalation to hit a metric', 'Close a ticket without a resolution'],
    model: 'databricks-claude-sonnet-4-6',
    avgTokens: 6400,
    avgCost: 0.02,
  },
];

// GxP oversight. Each agent is a governed extension of a responsible department, not of whoever
// triggered the pod. Delegating work to the pod never removes that department's human oversight: the
// content each agent produces must be signed by the responsible person, and every signature is
// registered to the audit trail (21 CFR Part 11 / Annex 11). The pod's requester (the RA lead) can
// sign only the final release — the clinical content and the labelling decision belong to other
// departments, and the dossier cannot be released until they have signed.
export interface ApprovalGate {
  id: string;
  of: string; // what is being signed off
  agentId: AgentId; // whose contribution
  department: string; // the accountable department (the agent is its extension)
  approverRole: string; // the responsible person who signs
  signature: 'Validated e-signature' | 'Named approver';
  requesterCanSign: boolean; // false when it is outside the pod requester's responsibility
}

const POD_GATES: Record<string, ApprovalGate[]> = {
  [SRP_ID]: [
    { id: 'g-csr', of: 'CSR clinical content · Module 2.5 / 2.7', agentId: 'clinical', department: 'Clinical Data Office', approverRole: 'CSR Lead · Clinical Data Office', signature: 'Validated e-signature', requesterCanSign: false },
    { id: 'g-label', of: 'Labelling decision', agentId: 'quality', department: 'Regulatory Operations', approverRole: 'Labelling Owner · Reg Ops', signature: 'Named approver', requesterCanSign: false },
    { id: 'g-release', of: 'Dossier release to filing', agentId: 'drafter', department: 'Global Regulatory Affairs', approverRole: 'RA Lead · Vaccines (you)', signature: 'Validated e-signature', requesterCanSign: true },
  ],
};

export const gatesForPod = (podId: string): ApprovalGate[] => POD_GATES[podId] ?? [];
export const gateForAgent = (podId: string, agentId: string): ApprovalGate | undefined => gatesForPod(podId).find((g) => g.agentId === agentId);

export function agentById(id: AgentId): PodAgent {
  const agent = SRP_AGENTS.find((a) => a.id === id);
  if (!agent) throw new Error(`Unknown agent ${id}`);
  return agent;
}

export const POD_RUN_HISTORY = [
  { run: 'RUN-1043', request: 'Dossier draft · NWP-1907733 (Phase II)', duration: '3m 41s', cost: 0.39, outcome: 'Approved' },
  { run: 'RUN-1039', request: 'Dossier draft · NWP-3316540 (Phase III)', duration: '4m 02s', cost: 0.47, outcome: 'Changes requested' },
  { run: 'RUN-1031', request: 'Dossier draft · NWP-2894512 (interim)', duration: '3m 18s', cost: 0.36, outcome: 'Approved' },
  { run: 'RUN-1027', request: 'Dossier draft · NWP-0551208 (Phase I)', duration: '2m 55s', cost: 0.31, outcome: 'Rejected' },
  { run: 'RUN-1020', request: 'Dossier draft · NWP-1907733 (Phase II)', duration: '3m 50s', cost: 0.41, outcome: 'Approved' },
];

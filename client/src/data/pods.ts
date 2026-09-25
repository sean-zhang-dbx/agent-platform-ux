import type { AgentId, Pod, PodAgent } from './types';

export const SRP_ID = 'submission-readiness';

export const PODS: Pod[] = [
  {
    id: SRP_ID,
    name: 'Submission Readiness Pod',
    domain: 'R&D',
    owner: 'Regulatory Affairs · Vaccines',
    autonomyTier: 'Tier 2 · human-on-the-loop',
    status: 'Active',
    version: 'v1.3',
    summary: 'Assesses whether a compound is ready to file: clinical data, regulatory precedent, open quality issues, then a go/no-go report for the RA lead.',
    agentNames: ['Clinical Data Agent', 'Regulatory Intel Agent', 'Quality Review Agent', 'Report Drafter'],
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
    name: 'Clinical Data Agent',
    role: 'Retrieves and summarises clinical trial data for the compound.',
    servicePrincipal: 'sp-rd-clin-7f3a',
    skills: ['clinical-summary-authoring'],
    tools: ['get-clinical-summary'],
    calls: ['clinical-trials-genie'],
    can: ['Query clinical trial tables (read-only)', 'Summarise endpoints, enrolment and signals'],
    cannot: ['Modify any data', 'Access blinded study data'],
    model: 'databricks-claude-sonnet-4-6',
    avgTokens: 18400,
    avgCost: 0.09,
  },
  {
    id: 'regintel',
    name: 'Regulatory Intel Agent',
    role: 'Finds precedent submissions for similar compounds.',
    servicePrincipal: 'sp-rd-reg-19c2',
    skills: ['regulatory-precedent-analysis'],
    tools: [],
    calls: ['regulatory-corpus-ka'],
    can: ['Search the regulatory document corpus', 'Cite every precedent'],
    cannot: ['Fabricate precedent', 'Contact health authorities'],
    model: 'databricks-claude-sonnet-4-6',
    avgTokens: 22100,
    avgCost: 0.11,
  },
  {
    id: 'quality',
    name: 'Quality Review Agent',
    role: 'Checks for open deviations, CAPAs or batch issues that could block filing.',
    servicePrincipal: 'sp-qa-rev-5b81',
    skills: ['quality-gate-assessment'],
    tools: ['check-deviation-status'],
    calls: ['quality-genie'],
    can: ['Read deviations, CAPAs and batch release status', 'Flag blocking issues'],
    cannot: ['Resolve or close deviations', 'Read manufacturing genealogy tables'],
    model: 'databricks-claude-sonnet-4-6',
    avgTokens: 12900,
    avgCost: 0.06,
  },
  {
    id: 'drafter',
    name: 'Report Drafter',
    role: 'Assembles the findings into a go/no-go readiness report.',
    servicePrincipal: 'sp-rd-draft-a44e',
    skills: ['readiness-report-template'],
    tools: ['save-report-draft'],
    calls: [],
    can: ['Draft the readiness report', 'Write the draft to the work plane'],
    cannot: ['Submit or sign the report', 'Make a claim without a cited source'],
    model: 'databricks-claude-sonnet-4-6',
    avgTokens: 26800,
    avgCost: 0.16,
  },
];

export const AGENT_IDS: AgentId[] = ['clinical', 'regintel', 'quality', 'drafter'];

export function agentById(id: AgentId): PodAgent {
  const agent = SRP_AGENTS.find((a) => a.id === id);
  if (!agent) throw new Error(`Unknown agent ${id}`);
  return agent;
}

export const POD_RUN_HISTORY = [
  { run: 'RUN-1043', request: 'Readiness check · GSK-1907733 (Phase II)', duration: '3m 41s', cost: 0.39, outcome: 'Approved' },
  { run: 'RUN-1039', request: 'Readiness check · GSK-3316540 (Phase III)', duration: '4m 02s', cost: 0.47, outcome: 'Changes requested' },
  { run: 'RUN-1031', request: 'Readiness check · GSK-2894512 (interim)', duration: '3m 18s', cost: 0.36, outcome: 'Approved' },
  { run: 'RUN-1027', request: 'Readiness check · GSK-0551208 (Phase I)', duration: '2m 55s', cost: 0.31, outcome: 'Rejected' },
  { run: 'RUN-1020', request: 'Readiness check · GSK-1907733 (Phase II)', duration: '3m 50s', cost: 0.41, outcome: 'Approved' },
];

import type { AgentStatus, LogKind, RequestStatus } from './types';

// Composer "thinking" lines, revealed one at a time before the pod proposal.
export const COMPOSER_STEPS: { text: string; detail?: string }[] = [
  { text: 'Reading the request', detail: 'compound NWP-2894512 · Phase III complete · intent: submission readiness · domain: R&D Regulatory' },
  { text: 'Breaking it into tasks', detail: 'clinical summary · regulatory precedent · open quality deviations · go/no-go report' },
  { text: 'Searching the skills catalog for each task', detail: '15 entries scanned (5 skills, 6 tools, 4 Databricks agents) · kept only Certified ones' },
  { text: 'Skipping 2 tools that are not certified', detail: 'LIMS Stability Data (Sandbox) · RIM Connector (Under Review)' },
  { text: 'Pulling context from Genie Ontology', detail: '4 snippets · 2 curated (UC Page, metric view) · 2 inferred' },
  { text: 'Matching a certified pod template', detail: 'Submission Readiness Pod v1.3 · 7 agents (4 Northwind-built, 3 Databricks) · 4 skills, 3 tools' },
  { text: 'Checking identities and access', detail: 'each role gets its own service principal · all read-only except Report Drafter (write draft only)' },
  { text: 'Pod draft ready for your review', detail: 'estimated 3 to 4 min · about $0.42 · approval required before anything is final' },
];

export interface ScriptStep {
  at: number; // ms after launch
  agent?: string; // agent id or 'orchestrator'
  status?: AgentStatus;
  kind?: LogKind;
  text?: string;
  short?: string; // what the run card shows for this agent
  cost?: number;
  tokens?: number;
  requestStatus?: RequestStatus;
}

// One deterministic run (~22s), including the two Day-5 moments from the spec:
// a blocked out-of-scope read and a model timeout with retry.
export const RUN_SCRIPT: ScriptStep[] = [
  { at: 300, agent: 'orchestrator', kind: 'info', text: 'Pod approved. Orchestrator split the request into 4 tasks.', short: 'Split into 4 tasks' },
  { at: 1200, agent: 'orchestrator', kind: 'info', text: 'Dispatching tasks 1 to 3 in parallel. Task 4 waits for their findings.', short: '3 agents working in parallel' },

  { at: 1800, agent: 'clinical', status: 'running', kind: 'info', text: 'Loaded skill Clinical Summary Authoring v1.4', short: 'Loaded skill' },
  { at: 2000, agent: 'regintel', status: 'running', kind: 'info', text: 'Loaded skill Regulatory Precedent Analysis v1.1', short: 'Loaded skill' },
  { at: 2200, agent: 'quality', status: 'running', kind: 'info', text: 'Loaded skill Quality Gate Assessment v1.2', short: 'Loaded skill' },

  { at: 3000, agent: 'clinical', kind: 'tool', text: 'get_clinical_summary("NWP-2894512") → 3 trials, 14,210 participants', short: '3 trials found', cost: 0.012, tokens: 2100 },
  { at: 3800, agent: 'quality', kind: 'tool', text: 'check_deviation_status("NWP-2894512") → 2 open deviations, 1 open CAPA', short: '2 open deviations', cost: 0.008, tokens: 1500 },
  { at: 4400, agent: 'regintel', kind: 'tool', text: 'Knowledge Assistant: "prior adjuvanted zoster vaccine submissions" → 6 documents', short: '6 precedent documents', cost: 0.021, tokens: 4800 },

  { at: 5200, agent: 'quality', status: 'blocked', kind: 'deny', text: 'Tried to read manufacturing.batch_genealogy: DENIED, not in this agent’s grants. Denial written to the audit log.', short: 'Denied: batch_genealogy (logged)' },
  { at: 6400, agent: 'orchestrator', kind: 'warn', text: 'Quality Review Agent was blocked. Routing around it: use the Quality Genie Agent’s batch_release summary instead.', short: 'Rerouted the Quality agent' },
  { at: 7000, agent: 'quality', status: 'running', kind: 'tool', text: 'Quality Genie Agent: "batch release status for NWP-2894512" → 4 lots released, 0 on hold', short: 'Rerouted · 4 lots released', cost: 0.014, tokens: 3200 },

  { at: 7600, agent: 'clinical', kind: 'tool', text: 'Clinical Trials Genie Agent: "primary endpoint results by trial" → efficacy 91.3% (95% CI 86.9–94.4)', short: 'Efficacy 91.3%', cost: 0.018, tokens: 3900 },
  { at: 8200, agent: 'regintel', status: 'retrying', kind: 'warn', text: 'Model call timed out after 30s (simulated). Orchestrator retrying, attempt 2 of 3.', short: 'Timed out · retrying' },
  { at: 9400, agent: 'clinical', status: 'complete', kind: 'ok', text: 'Clinical summary ready: 3 trials, primary endpoint met, no new safety signal.', short: 'Done', cost: 0.041, tokens: 8200 },
  { at: 10200, agent: 'regintel', status: 'running', kind: 'info', text: 'Retry succeeded.', short: 'Retry succeeded' },
  { at: 10800, agent: 'quality', status: 'complete', kind: 'ok', text: 'Quality gate: 1 blocking deviation (DEV-2291, major), 1 non-blocking.', short: 'Done', cost: 0.022, tokens: 4400 },
  { at: 12200, agent: 'regintel', kind: 'tool', text: 'Precedent analysis: 3 comparable filings, median 41 weeks to approval, top HA query topic: immunogenicity bridging', short: '3 comparable filings', cost: 0.033, tokens: 7100 },
  { at: 13200, agent: 'regintel', status: 'complete', kind: 'ok', text: 'Precedent analysis ready, 6 citations.', short: 'Done', cost: 0.029, tokens: 5600 },

  { at: 13800, agent: 'orchestrator', kind: 'info', text: 'All findings in. Handing off to Report Drafter.', short: 'Handing off to Report Drafter' },
  { at: 14400, agent: 'drafter', status: 'running', kind: 'info', text: 'Loaded skill Submission Readiness Report v2.3', short: 'Loaded skill' },
  { at: 16200, agent: 'drafter', kind: 'tool', text: 'Drafting 5 sections, checking every claim has a cited source', short: 'Drafting 5 sections', cost: 0.071, tokens: 14800 },
  { at: 18400, agent: 'drafter', kind: 'info', text: 'Flagged 3 items for the RA lead.', short: 'Flagged 3 items', cost: 0.048, tokens: 9900 },
  { at: 19400, agent: 'drafter', status: 'complete', kind: 'ok', text: 'Draft written to the work plane. Report Drafter cannot submit it.', short: 'Done' },
  { at: 20000, agent: 'orchestrator', kind: 'ok', text: 'Pod finished. Waiting for human approval.', short: 'Done · waiting for your sign-off', requestStatus: 'pending_approval' },
];

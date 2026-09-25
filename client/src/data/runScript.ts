import type { AgentStatus, LogKind, RequestStatus } from './types';

// Composer "thinking" lines, revealed one at a time before the pod proposal.
export const COMPOSER_STEPS: { text: string; detail?: string }[] = [
  { text: 'Reading the request', detail: 'compound NWP-2894512 · Phase III complete, DB locked · intent: author submission dossier · domain: R&D Regulatory' },
  { text: 'Breaking it into tasks', detail: 'draft CSR sections · draft HA responses · check consistency & labelling · assemble eCTD Module 2' },
  { text: 'Searching the skills catalog for each task', detail: '15 entries scanned (5 skills, 6 tools, 4 Databricks agents) · kept only Certified ones' },
  { text: 'Skipping 2 tools that are not certified', detail: 'LIMS Stability Data (Sandbox) · RIM Connector (Under Review)' },
  { text: 'Pulling context through Genie One (MCP)', detail: 'Genie Ontology (locked endpoints) · Glean (prior CSRs) · Stardog (study & role model) · permission-aware' },
  { text: 'Matching a certified pod template', detail: 'Submission Dossier Pod v1.3 · 7 agents (4 Northwind-built, 3 Databricks) · 4 skills, 3 tools' },
  { text: 'Checking identities and access', detail: 'each role gets its own service principal · all read-only except the eCTD Assembler (write draft only)' },
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
  { at: 1200, agent: 'orchestrator', kind: 'info', text: 'Dispatching tasks 1 to 3 in parallel. The eCTD Assembler waits for their drafts.', short: '3 agents working in parallel' },

  { at: 1800, agent: 'clinical', status: 'running', kind: 'info', text: 'Loaded skill CSR Section Authoring v1.4', short: 'Loaded skill' },
  { at: 2000, agent: 'regintel', status: 'running', kind: 'info', text: 'Loaded skill HA Query Response Drafting v1.1', short: 'Loaded skill' },
  { at: 2200, agent: 'quality', status: 'running', kind: 'info', text: 'Loaded skill Labeling Consistency Check v1.2', short: 'Loaded skill' },

  { at: 3000, agent: 'clinical', kind: 'tool', text: 'get_clinical_summary("NWP-2894512") → 3 trials, 14,210 participants (locked)', short: '3 trials, locked', cost: 0.012, tokens: 2100 },
  { at: 3800, agent: 'quality', kind: 'tool', text: 'label_text_diff(draft, approved USPI) → 1 dose-interval term differs', short: '1 labelling mismatch', cost: 0.008, tokens: 1500 },
  { at: 4400, agent: 'regintel', kind: 'tool', text: 'HAQ&R over prior Q&A: "likely questions for an adjuvanted booster" → 7 questions, 6 with a prior answer', short: '6 of 7 prior answers', cost: 0.021, tokens: 4800 },

  { at: 5200, agent: 'quality', status: 'blocked', kind: 'deny', text: 'Tried to read demo.pharma.patient_summary (patient-level): DENIED, not in this agent’s grants. Denial written to the audit log.', short: 'Denied: patient_summary (logged)' },
  { at: 6400, agent: 'orchestrator', kind: 'warn', text: 'QC & Consistency Agent was blocked. Routing around it: cross-check numbers via the Clinical Trials Genie trial-level summary instead.', short: 'Rerouted the QC agent' },
  { at: 7000, agent: 'quality', status: 'running', kind: 'tool', text: 'Clinical Trials Genie Agent: "primary endpoint by trial" → figures match every drafted section', short: 'Rerouted · figures match', cost: 0.014, tokens: 3200 },

  { at: 7600, agent: 'clinical', kind: 'tool', text: 'save_csr_draft: Module 2.5 + 2.7 sections, efficacy 91.3% (95% CI 86.9–94.4), every figure cited', short: 'CSR sections drafted', cost: 0.018, tokens: 3900 },
  { at: 8200, agent: 'regintel', status: 'retrying', kind: 'warn', text: 'Model call timed out after 30s (simulated). Orchestrator retrying, attempt 2 of 3.', short: 'Timed out · retrying' },
  { at: 9400, agent: 'clinical', status: 'complete', kind: 'ok', text: 'CSR sections drafted from the locked data, no new safety signal.', short: 'Done', cost: 0.041, tokens: 8200 },
  { at: 10200, agent: 'regintel', status: 'running', kind: 'info', text: 'Retry succeeded.', short: 'Retry succeeded' },
  { at: 10800, agent: 'quality', status: 'complete', kind: 'ok', text: 'Consistency clean; 1 labelling term to resolve against the approved USPI.', short: 'Done', cost: 0.022, tokens: 4400 },
  { at: 12200, agent: 'regintel', kind: 'tool', text: 'Drafted first-pass answers: 6 reuse an approved prior answer, immunogenicity bridging drafted from the 2019 response', short: '7 HA answers drafted', cost: 0.033, tokens: 7100 },
  { at: 13200, agent: 'regintel', status: 'complete', kind: 'ok', text: 'HA responses drafted, every answer cited.', short: 'Done', cost: 0.029, tokens: 5600 },

  { at: 13800, agent: 'orchestrator', kind: 'info', text: 'All drafts in. Handing off to the eCTD Assembler.', short: 'Handing off to eCTD Assembler' },
  { at: 14400, agent: 'drafter', status: 'running', kind: 'info', text: 'Loaded skill eCTD Module Mapping v2.3', short: 'Loaded skill' },
  { at: 16200, agent: 'drafter', kind: 'tool', text: 'Placing drafted sections into Module 2, checking every claim has a cited source', short: 'Assembling Module 2', cost: 0.071, tokens: 14800 },
  { at: 18400, agent: 'drafter', kind: 'info', text: 'Flagged 2 items for the RA lead.', short: 'Flagged 2 items', cost: 0.048, tokens: 9900 },
  { at: 19400, agent: 'drafter', status: 'complete', kind: 'ok', text: 'Dossier draft written to the work plane. The eCTD Assembler cannot submit it.', short: 'Done' },
  { at: 20000, agent: 'orchestrator', kind: 'ok', text: 'Pod finished. 3 sign-offs pending across the responsible departments.', short: 'Done · 3 sign-offs pending', requestStatus: 'pending_approval' },
];

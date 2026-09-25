// The continuous operating model for the IT Service Desk Pod. Grounded in current agentic-ITSM
// practice: event-driven intake from ServiceNow, triage with a confidence score, a decision that
// auto-resolves the safe/known/reversible cases and escalates the rest, all under runtime guardrails.

export interface ConnectedSystem {
  name: string;
  via: string;
  used: string;
}
export interface OpStage {
  key: string;
  label: string;
  via?: string;
  note: string;
  decision?: boolean;
}
export interface DecisionBand {
  range: string;
  label: string;
  action: string;
  tone: 'ok' | 'warn' | 'deny';
}
export interface OpTicket {
  id: string;
  summary: string;
  category: string;
  confidence: number;
  outcome: 'Auto-resolved' | 'Assisted' | 'Escalated';
  note: string;
}

export const IT_TRIGGER = 'ServiceNow event · incident.created / monitoring alert';

export const IT_SYSTEMS: ConnectedSystem[] = [
  { name: 'ServiceNow', via: 'MCP · system of record', used: 'search_incidents · get_cmdb_ci · update_incident · add_comment · create_incident' },
  { name: 'IT Knowledge Base', via: 'Knowledge Assistant', used: 'known-error & runbook retrieval (RAG)' },
  { name: 'Genie Ontology', via: 'context layer', used: 'CMDB & asset semantics, permission-aware' },
];

export const IT_STAGES: OpStage[] = [
  { key: 'intake', label: 'Intake', via: 'ServiceNow', note: 'A new ticket or alert arrives and is deduped against open incidents.' },
  { key: 'triage', label: 'Triage', via: 'CMDB + KB', note: 'Classify category, priority and probable cause; attach evidence; score confidence.' },
  { key: 'decision', label: 'Decision', note: 'Auto-resolve if the fix is known, reversible and confident — otherwise escalate.', decision: true },
  { key: 'act', label: 'Resolve / Escalate', via: 'ServiceNow', note: 'Run the reversible runbook and close, or route to the right team with a summary.' },
  { key: 'audit', label: 'Audit', note: 'Every action is written back to the ticket, traced and scored.' },
];

export const IT_BANDS: DecisionBand[] = [
  { range: '≥ 0.90', label: 'known & reversible', action: 'Auto-resolve in ServiceNow', tone: 'ok' },
  { range: '0.70 – 0.90', label: 'likely fix', action: 'Prepared fix · one-click for Tier 1', tone: 'warn' },
  { range: '< 0.70 · or prod-impact', label: 'uncertain or risky', action: 'Escalate to a person with a full summary', tone: 'deny' },
];

export const IT_GUARDRAILS = [
  'Least-privilege ServiceNow writes (agent identity + ABAC)',
  'Only idempotent, reversible runbooks auto-run',
  'Kill-switch + per-ticket budget cap',
  'Immutable audit: input, model, confidence, evidence, action',
];

export const IT_STATS = [
  { label: 'Deflection', value: '48%', sub: 'resolved without a person' },
  { label: 'Auto-resolve precision', value: '96%', sub: 'no reopen in 72h' },
  { label: 'Median MTTR', value: '6 min', sub: 'was 4h 20m' },
  { label: 'Escalated', value: '31%', sub: 'routed to a team' },
];

export const IT_TICKETS: OpTicket[] = [
  { id: 'INC0048213', summary: 'VPN client drops after update', category: 'Network · VPN', confidence: 0.93, outcome: 'Auto-resolved', note: 'Known error KB0021 · rolled client back to 7.4.2' },
  { id: 'INC0048210', summary: 'Password reset — account locked out', category: 'Access', confidence: 0.98, outcome: 'Auto-resolved', note: 'Verified identity · reset · notified user' },
  { id: 'INC0048208', summary: 'Shared mailbox access request', category: 'Access', confidence: 0.82, outcome: 'Assisted', note: 'Prepared change · one-click for the Service Desk' },
  { id: 'INC0048205', summary: 'Prod DB latency on payments-svc', category: 'Infrastructure', confidence: 0.61, outcome: 'Escalated', note: 'Production CI · routed to SRE on-call with evidence' },
  { id: 'INC0048201', summary: 'Laptop won’t boot after patch', category: 'Endpoint', confidence: 0.55, outcome: 'Escalated', note: 'Novel · routed to the Endpoint team' },
];

// Live-run seed: the counters the console starts from (today so far), then ticks up as tickets stream.
// Consistent with the 30-day headline: auto 616 + assisted 271 + escalated 397 = 1284 (48% / 21% / 31%).
export const IT_LIVE_SEED = { handled: 1284, autoResolved: 616, assisted: 271, escalated: 397, inQueue: 8, mttrMin: 6 };

// Pool the live console cycles through (ids are generated at runtime as tickets arrive).
export const IT_STREAM: Omit<OpTicket, 'id'>[] = [
  { summary: 'Password reset — account locked out', category: 'Access', confidence: 0.98, outcome: 'Auto-resolved', note: 'Verified identity · reset · notified user' },
  { summary: 'VPN client drops after update', category: 'Network · VPN', confidence: 0.93, outcome: 'Auto-resolved', note: 'Known error KB0021 · rolled client back to 7.4.2' },
  { summary: 'Outlook not syncing on mobile', category: 'Email', confidence: 0.91, outcome: 'Auto-resolved', note: 'Re-provisioned profile · cleared token' },
  { summary: 'MFA device lost', category: 'Access', confidence: 0.88, outcome: 'Assisted', note: 'Prepared re-enrol · one-click for the Service Desk' },
  { summary: 'Shared mailbox access request', category: 'Access', confidence: 0.82, outcome: 'Assisted', note: 'Prepared change · needs owner approval' },
  { summary: 'Software install — Tableau', category: 'Endpoint', confidence: 0.9, outcome: 'Auto-resolved', note: 'Pushed via MDM · licence checked' },
  { summary: 'Disk almost full on a dev VM', category: 'Infrastructure', confidence: 0.92, outcome: 'Auto-resolved', note: 'Cleared temp · expanded volume (reversible)' },
  { summary: 'Prod DB latency on payments-svc', category: 'Infrastructure', confidence: 0.61, outcome: 'Escalated', note: 'Production CI · routed to SRE on-call with evidence' },
  { summary: 'Laptop won’t boot after patch', category: 'Endpoint', confidence: 0.55, outcome: 'Escalated', note: 'Novel · routed to the Endpoint team' },
  { summary: 'Repeated login failures — possible breach', category: 'Security', confidence: 0.4, outcome: 'Escalated', note: 'Security-sensitive · routed to SecOps' },
  { summary: 'Printer offline — floor 3', category: 'Endpoint', confidence: 0.94, outcome: 'Auto-resolved', note: 'Restarted the print queue' },
  { summary: 'Slow file share access', category: 'Network', confidence: 0.78, outcome: 'Assisted', note: 'Prepared DNS fix · one-click' },
  { summary: 'New starter — provision access', category: 'Access', confidence: 0.86, outcome: 'Assisted', note: 'Role-based access bundle prepared' },
  { summary: 'API gateway 5xx spike', category: 'Infrastructure', confidence: 0.5, outcome: 'Escalated', note: 'Production impact · routed to Platform SRE' },
];

export const isOperationalPod = (podId: string): boolean => podId === 'it-service';

// Shared contract for the trial feasibility workflow (server engine + client UI).

export type WsKey = 'protocol' | 'sites' | 'diversity' | 'drafter';
export type WsState = 'pending' | 'in_progress' | 'awaiting_approval' | 'approved' | 'rejected' | 'complete';
export type RunStatus = 'running' | 'awaiting_gates' | 'blocked' | 'awaiting_release' | 'released';
export type Decision = 'approve' | 'reject' | 'request_changes';

export interface Reviewer {
  role: string;
  name: string;
}

export interface WsMeta {
  key: WsKey;
  agent: string;
  purpose: string;
  system: string; // system of record it reads (and writes)
  gate: Reviewer | null; // null = runs autonomously
}

export const WORKSTREAMS: WsMeta[] = [
  { key: 'protocol', agent: 'Protocol Feasibility Agent', purpose: 'Scores protocol feasibility against historical trials', system: 'CTMS', gate: null },
  { key: 'sites', agent: 'Site Selection Agent', purpose: 'Drafts a ranked candidate site list', system: 'Site & safety database', gate: { role: 'Site Selection Lead', name: 'Dr. Hannah Okafor' } },
  { key: 'diversity', agent: 'Patient Diversity Agent', purpose: 'Proposes a diversity enrollment plan', system: 'Protocol & regulatory library', gate: { role: 'Patient Diversity Lead', name: 'Dr. Marcus Chen' } },
  { key: 'drafter', agent: 'Clinical Drafter Agent', purpose: 'Drafts protocol language and frames estimands', system: 'Document repository', gate: { role: 'Clinical Drafter', name: 'Elena Rossi' } },
];

export const PROGRAM_LEAD: Reviewer = { role: 'Program Lead', name: 'Dr. James Whitfield' };

export const STATE_ORDER: WsState[] = ['pending', 'in_progress', 'awaiting_approval', 'approved', 'complete'];

export const wsMeta = (k: string): WsMeta => WORKSTREAMS.find((w) => w.key === k) ?? WORKSTREAMS[0];

export interface StudyPreset {
  id: string;
  compound: string;
  studyId: string;
  indication: string;
  phase: string;
  title: string;
  targetEnrollment: number;
}

export const PRESETS: StudyPreset[] = [
  { id: 'rsv-oa', compound: 'GSK-4182136', studyId: 'RSV-OA-310', indication: 'RSV', phase: 'III', title: 'RSV vaccine in adults 60+ · Phase III', targetEnrollment: 12000 },
  { id: 'copd-ii', compound: 'GSK-3975511', studyId: 'COPD-EX-207', indication: 'COPD', phase: 'II', title: 'COPD exacerbation reduction · Phase II', targetEnrollment: 640 },
];

export interface EventRow {
  id: number;
  ws_key: string | null;
  at: string;
  kind: 'info' | 'api' | 'gate' | 'ok' | 'warn' | 'deny';
  text: string;
}

export interface WorkstreamRow {
  ws_key: WsKey;
  state: WsState;
  attempt: number;
  output: Record<string, unknown> | null;
  output_hash: string | null;
  artifact_ref: string | null;
  sources: SourceUse[];
  feedback: string | null;
  updated_at: string;
}

export interface SourceUse {
  system: string;
  call: string; // e.g. GET /api/sor/ctms/trials?indication=RSV
  records: number;
  table: string;
  ids: string[];
}

export interface AuditRow {
  seq: number;
  run_id: string;
  ws_key: string;
  record_type: 'gate_decision' | 'release';
  reviewer: string;
  role: string;
  decision: string;
  signature_meaning: string;
  signature_name: string;
  comment: string;
  authenticated_as: string;
  signed_at: string;
  artifact_ref: string;
  artifact_hash: string;
  attempt: number;
  prev_hash: string;
  record_hash: string;
}

export interface RunRow {
  run_id: string;
  study_id: string;
  compound: string;
  indication: string;
  phase: string;
  title: string;
  target_enrollment: number;
  created_by: string;
  created_at: string;
  status: RunStatus;
  package_hash: string | null;
  released_at: string | null;
  released_by: string | null;
  locked: boolean;
}

export interface RunDetail {
  run: RunRow;
  workstreams: WorkstreamRow[];
  events: EventRow[];
  audit: AuditRow[];
  contacted: string[];
}

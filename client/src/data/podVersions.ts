// Improvement lifecycle for the Submission Dossier Pod. A running pod stays on its approved
// version; candidates are built from traces and reviewer corrections, then evaluated offline.

export type VersionId = 'v1.3' | 'v1.4';

export const LIFECYCLE = ['Feedback', 'Candidate', 'Evaluate', 'Approve', 'Live'];

export const CANDIDATE_CHANGES = [
  { area: 'Skill', text: 'CSR Section Authoring: pull efficacy figures only from locked endpoint rows' },
  { area: 'Context', text: 'Reuse the matched prior HA answer before drafting a new one' },
];

export interface Metric {
  name: string;
  live: string;
  candidate: string;
  heldOut: string;
  liveN: number;
  candidateN: number;
  heldOutN: number;
  higherIsBetter: boolean;
  delta: string;
}

// Representative set: 40 past requests. Held-out set: 15 cases owned by QA, never seen by the optimizer.
export const METRICS: Metric[] = [
  { name: 'Correctness', live: '0.86', candidate: '0.91', heldOut: '0.90', liveN: 0.86, candidateN: 0.91, heldOutN: 0.9, higherIsBetter: true, delta: '+0.05' },
  { name: 'Completeness', live: '92%', candidate: '95%', heldOut: '94%', liveN: 92, candidateN: 95, heldOutN: 94, higherIsBetter: true, delta: '+3 pts' },
  { name: 'Reviewer effort', live: '18 min', candidate: '11 min', heldOut: '12 min', liveN: 18, candidateN: 11, heldOutN: 12, higherIsBetter: false, delta: '−7 min' },
  { name: 'Cost per run', live: '$0.42', candidate: '$0.31', heldOut: '$0.32', liveN: 0.42, candidateN: 0.31, heldOutN: 0.32, higherIsBetter: false, delta: '−26%' },
  { name: 'Latency', live: '3m 41s', candidate: '3m 05s', heldOut: '3m 10s', liveN: 221, candidateN: 185, heldOutN: 190, higherIsBetter: false, delta: '−36 s' },
];

export const GUARD = ['Permissions unchanged', 'Approval rules unchanged', 'Acceptance criteria unchanged'];

export const BASE_FEEDBACK = 23;

import type { AgentId } from './types';

export interface Citation {
  id: string;
  agent: AgentId;
  source: string;
}

export const CITATIONS: Citation[] = [
  { id: 'C1', agent: 'clinical', source: 'demo.pharma.clinical_trials · trials ZOS-301, ZOS-302, ZOS-305' },
  { id: 'C2', agent: 'clinical', source: 'demo.pharma.trial_endpoints · primary endpoint rows' },
  { id: 'C3', agent: 'regintel', source: 'regulatory_docs/prior_submission_summary_2019.pdf, p.4' },
  { id: 'C4', agent: 'regintel', source: 'regulatory_docs/ha_query_log_zoster.pdf, p.11' },
  { id: 'C5', agent: 'quality', source: 'demo.pharma.deviations · DEV-2291, DEV-2304' },
  { id: 'C6', agent: 'quality', source: 'demo.pharma.batch_release · lots 24A01 to 24A04' },
];

export const AGENT_FINDINGS: Record<AgentId, { headline: string; short: string; bullets: string[] }> = {
  clinical: {
    headline: 'Primary endpoint met across 3 Phase III trials',
    short: 'Endpoint met · 3 trials',
    bullets: [
      '14,210 participants across ZOS-301, 302 and 305 [C1]',
      'Vaccine efficacy 91.3% (95% CI 86.9 to 94.4) [C2]',
      'No new safety signal versus the Phase II profile [C2]',
    ],
  },
  regintel: {
    headline: '3 comparable filings, median 41 weeks to approval',
    short: '3 precedents · 41 wks median',
    bullets: [
      'Closest precedent: adjuvanted zoster booster, 2019 filing [C3]',
      'Most common HA query: immunogenicity bridging between lots [C4]',
      'Risk flag: bridging data should be in Module 2.7.3 up front [C4]',
    ],
  },
  quality: {
    headline: '1 blocking deviation, 1 non-blocking',
    short: '1 blocking deviation',
    bullets: [
      'DEV-2291 (major, fill-finish line): open, target close 14 Oct [C5]',
      'DEV-2304 (minor, labelling): open, not blocking [C5]',
      '4 of 4 lots released, none on hold [C6]',
      'Note: one read was denied (out of scope) and logged. Routed via batch_release instead.',
    ],
  },
  drafter: {
    headline: 'Readiness report drafted, 3 items flagged',
    short: 'Report drafted · 3 flags',
    bullets: ['5 sections, every claim cited', 'Cannot submit: routed to the RA lead for approval'],
  },
};

export const REPORT = {
  recommendation: 'CONDITIONAL GO',
  recommendationDetail: 'Ready to file once DEV-2291 is closed and the bridging data is added to Module 2.7.3.',
  sections: [
    { title: 'Clinical summary', body: 'Primary efficacy endpoint met in all 3 pivotal trials, with no new safety signal.', cites: ['C1', 'C2'] },
    { title: 'Regulatory precedent', body: 'Three comparable filings, median 41 weeks to approval. Immunogenicity bridging was the most frequent HA query.', cites: ['C3', 'C4'] },
    { title: 'Quality gate', body: 'One major deviation on the fill-finish line is still open and would block filing. All lots are released.', cites: ['C5', 'C6'] },
    { title: 'Timeline estimate', body: 'If DEV-2291 closes by 14 Oct, filing is feasible in the current quarter.', cites: ['C3', 'C5'] },
  ],
  flags: [
    { level: 'blocking', text: 'DEV-2291 is open (major). Filing blocked until it is closed.' },
    { level: 'attention', text: 'Add lot-to-lot immunogenicity bridging to Module 2.7.3 before submission.' },
    { level: 'attention', text: 'Quality Review Agent hit an access denial. Confirm the batch_release route is acceptable evidence.' },
  ],
};

export const EVIDENCE_ROWS: { agent: AgentId | 'orchestrator'; trace: string; model: string; tokens: number; cost: number }[] = [
  { agent: 'orchestrator', trace: 'tr-8f21c0', model: 'databricks-claude-sonnet-4-6', tokens: 6200, cost: 0.03 },
  { agent: 'clinical', trace: 'tr-8f21c4', model: 'databricks-claude-sonnet-4-6', tokens: 14200, cost: 0.071 },
  { agent: 'regintel', trace: 'tr-8f21c7', model: 'databricks-claude-sonnet-4-6', tokens: 17500, cost: 0.083 },
  { agent: 'quality', trace: 'tr-8f21c9', model: 'databricks-claude-sonnet-4-6', tokens: 9100, cost: 0.044 },
  { agent: 'drafter', trace: 'tr-8f21cb', model: 'databricks-claude-sonnet-4-6', tokens: 24700, cost: 0.119 },
];

// Platform-evaluated acceptance checks declared by the capability (MLflow scorers in the live build).
export const ACCEPTANCE_RESULTS = [
  { name: 'Citations', result: '14 / 14 claims cited' },
  { name: 'Completeness', result: '4 / 4 sections' },
  { name: 'Correctness', result: '0.91 vs expert answer' },
  { name: 'Approved sources only', result: 'no uncertified data used' },
];

export const DEFAULT_REQUEST =
  'Assess submission readiness for compound GSK-2894512 (Shingrix booster, Phase III complete). Pull the clinical summary, check regulatory history for similar submissions, review any open quality deviations that could block filing, and draft a readiness report with a go/no-go recommendation. Flag anything that needs my attention before I sign off.';

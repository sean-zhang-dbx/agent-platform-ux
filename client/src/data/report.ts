import type { AgentId } from './types';

export interface Citation {
  id: string;
  agent: AgentId;
  source: string;
}

export const CITATIONS: Citation[] = [
  { id: 'C1', agent: 'clinical', source: 'demo.pharma.clinical_trials · trials NWV-301, NWV-302, NWV-305' },
  { id: 'C2', agent: 'clinical', source: 'demo.pharma.trial_endpoints · primary endpoint rows' },
  { id: 'C3', agent: 'regintel', source: 'regulatory_docs/ha_query_log_zoster.pdf, p.11 · prior answer' },
  { id: 'C4', agent: 'regintel', source: 'regulatory_docs/prior_submission_summary_2019.pdf, p.4' },
  { id: 'C5', agent: 'quality', source: 'rd_reg.docs.labels · approved USPI, section 8.1' },
  { id: 'C6', agent: 'quality', source: 'demo.pharma.trial_endpoints · cross-checked via Clinical Trials Genie' },
];

export const AGENT_FINDINGS: Record<string, { headline: string; short: string; bullets: string[] }> = {
  clinical: {
    headline: 'CSR clinical summary drafted from the locked data',
    short: 'CSR sections drafted',
    bullets: [
      'Module 2.5 + 2.7 efficacy/safety sections drafted, every figure traced to a locked endpoint row [C1][C2]',
      'Vaccine efficacy 91.3% (95% CI 86.9 to 94.4), no new safety signal [C2]',
      'First-draft in minutes, not weeks — the authoring long pole, not the science',
    ],
  },
  regintel: {
    headline: 'First-pass answers to 7 likely HA questions',
    short: '7 HA answers drafted',
    bullets: [
      '6 of 7 matched an approved prior answer (HAQ&R), reused and cited [C3]',
      'Closest precedent: adjuvanted zoster booster, 2019 filing [C4]',
      'Immunogenicity bridging: first reply drafted from the 2019 response [C3]',
    ],
  },
  quality: {
    headline: 'Consistency clean; 1 labelling mismatch to resolve',
    short: '1 labelling mismatch',
    bullets: [
      'Figures agree across every drafted section [C6]',
      'One dose-interval term differs from the approved USPI [C5]',
      'Note: a patient-level read was denied (out of scope) and logged. Rerouted to the certified trial-level summary [C6]',
    ],
  },
  drafter: {
    headline: 'eCTD Module 2 assembled, 2 items flagged',
    short: 'Dossier assembled · 2 flags',
    bullets: ['Drafted sections placed into the eCTD structure, every claim cited', 'Cannot submit: routed to the RA lead for approval'],
  },
};

export const REPORT = {
  recommendation: 'DRAFT COMPLETE · 2 ITEMS',
  recommendationDetail: 'A cited Module 2 dossier draft is ready to review. Resolve the labelling term and confirm the reused HA answer, then sign to file.',
  sections: [
    { title: 'Clinical summary (CSR)', body: 'Module 2.5 and 2.7 sections drafted from the locked data. Primary endpoint met in all 3 pivotal trials, no new safety signal — every figure cited.', cites: ['C1', 'C2'] },
    { title: 'HA responses', body: 'First-pass answers drafted for the 7 likely questions; 6 reused an approved prior answer found by HAQ&R. Immunogenicity bridging drafted from the 2019 response.', cites: ['C3', 'C4'] },
    { title: 'Consistency & labelling', body: 'Numbers agree across sections. One dose-interval term differs from the approved USPI and needs a decision before filing.', cites: ['C5', 'C6'] },
    { title: 'eCTD assembly', body: 'Sections placed into the Module 2 structure. Authoring done in this run is the 6-of-8-week long pole Northwind is compressing (41 → 14.9 weeks, targeting 8).', cites: ['C1', 'C3'] },
  ],
  flags: [
    { level: 'attention', text: 'Labelling: a dose-interval term differs from the approved USPI. Confirm the wording before filing.' },
    { level: 'attention', text: 'HA response on immunogenicity bridging reuses the 2019 answer. Confirm it still applies to this lot.' },
    { level: 'attention', text: 'QC & Consistency Agent hit an access denial on patient-level data. Confirm the trial-level route is acceptable evidence.' },
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
  { name: 'Citations', result: '18 / 18 drafted claims cited' },
  { name: 'Completeness', result: 'CSR + Module 2 sections' },
  { name: 'Consistency', result: 'labelling matches source' },
  { name: 'Approved sources only', result: 'no uncertified data used' },
];

export const DEFAULT_REQUEST =
  'Author the submission dossier for compound NWP-2894512 (adult vaccine booster, Phase III complete, database locked). Draft the CSR clinical summary and efficacy/safety sections from the locked data, check labelling and cross-section consistency, draft first-pass responses to the likely health-authority questions from our prior Q&A, and assemble the eCTD Module 2. Cite every claim and flag anything that needs my call before I sign off.';

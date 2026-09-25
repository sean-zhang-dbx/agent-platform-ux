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
  ontology: OntologySnippet[];
  controls: CapabilityControl[];
  checks: { name: string; target: string }[];
}

export const SRA_ID = 'assess-submission-readiness';

export const FLAGSHIP: Capability = {
    id: SRA_ID,
    name: 'Assess submission readiness',
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
      'Assess submission readiness for compound GSK-2894512 (Shingrix booster, Phase III complete). Pull the clinical summary, check regulatory history for similar submissions, review any open quality deviations that could block filing, and draft a readiness report with a go/no-go recommendation. Flag anything that needs my attention before I sign off.',
    skills: ['clinical-summary-authoring', 'regulatory-precedent-analysis', 'quality-gate-assessment', 'readiness-report-template'],
    tools: ['get-clinical-summary', 'check-deviation-status', 'save-report-draft'],
    links: [
      ['clinical-summary-authoring', 'get-clinical-summary'],
      ['get-clinical-summary', 'd-clinical'],
      ['regulatory-precedent-analysis', 'd-regulatory'],
      ['quality-gate-assessment', 'check-deviation-status'],
      ['check-deviation-status', 'd-quality'],
      ['readiness-report-template', 'save-report-draft'],
    ],
    data: [
      { id: 'd-clinical', name: 'Clinical trial results', ref: 'demo.pharma.clinical_trials, trial_endpoints', via: 'Clinical Trials Genie Agent', readBy: ['get-clinical-summary', 'clinical-trials-genie'] },
      { id: 'd-regulatory', name: 'Regulatory history', ref: 'demo.pharma.regulatory_docs (18 PDFs)', via: 'Regulatory Document Corpus', readBy: ['regulatory-corpus-ka'] },
      { id: 'd-quality', name: 'Deviations & batch release', ref: 'demo.pharma.deviations, capas, batch_release', via: 'Quality & Deviations Genie Agent', readBy: ['check-deviation-status', 'quality-genie'] },
    ],
    context: [
      { key: 'Study', value: 'ZOS-301 · 302 · 305' },
      { key: 'Phase', value: 'III complete' },
      { key: 'Jurisdiction', value: 'FDA (US)' },
      { key: 'User', value: 'RA Lead · Vaccines' },
    ],
    ontology: [
      {
        kind: 'Business rule',
        text: 'A deviation is “blocking” when it is Major or Critical and linked to a lot in the filing.',
        origin: 'Curated',
        source: 'UC Page · Regulatory glossary',
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
        text: 'Precedent questions are answered from the Regulatory Document Corpus, not email archives.',
        origin: 'Inferred',
        source: 'Genie Agent usage',
        authority: 0.81,
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
      { declared: 'Read-only on clinical and quality data', enforcedBy: 'Unity Catalog grants' },
      { declared: 'No blinded or manufacturing genealogy data', enforcedBy: 'Unity Catalog grants · denials logged' },
      { declared: 'RA lead signs off before anything is final', enforcedBy: 'Approval gate' },
      { declared: 'Every claim cites a source', enforcedBy: 'MLflow scorer' },
      { declared: 'Max $1.00 per run', enforcedBy: 'AI Gateway budget' },
    ],
    checks: [
      { name: 'Citations', target: '100% of claims' },
      { name: 'Completeness', target: 'all 4 sections' },
      { name: 'Correctness', target: '≥ 0.90 vs expert answer' },
      { name: 'Approved sources only', target: 'no uncertified data' },
    ],
  };

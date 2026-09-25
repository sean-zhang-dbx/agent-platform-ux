// Seeded systems of record (mock). Every value here is synthetic.

export interface TrialSeed {
  trial_id: string;
  indication: string;
  phase: string;
  title: string;
  planned_enrollment: number;
  actual_enrollment: number;
  planned_months: number;
  actual_months: number;
  sites: number;
  screen_fail_rate: number;
  amendments: number;
  status: string;
}

export const CTMS_TRIALS: TrialSeed[] = [
  { trial_id: 'CT-RSV-301', indication: 'RSV', phase: 'III', title: 'RSVPreF3 OA efficacy, season 1', planned_enrollment: 25000, actual_enrollment: 24966, planned_months: 14, actual_months: 15, sites: 275, screen_fail_rate: 0.08, amendments: 2, status: 'Completed' },
  { trial_id: 'CT-RSV-302', indication: 'RSV', phase: 'III', title: 'RSV OA lot-to-lot consistency', planned_enrollment: 750, actual_enrollment: 757, planned_months: 6, actual_months: 6, sites: 18, screen_fail_rate: 0.05, amendments: 0, status: 'Completed' },
  { trial_id: 'CT-RSV-304', indication: 'RSV', phase: 'III', title: 'RSV OA co-administration with influenza', planned_enrollment: 1040, actual_enrollment: 1029, planned_months: 8, actual_months: 10, sites: 31, screen_fail_rate: 0.11, amendments: 1, status: 'Completed' },
  { trial_id: 'CT-RSV-306', indication: 'RSV', phase: 'III', title: 'RSV OA revaccination interval', planned_enrollment: 1650, actual_enrollment: 1422, planned_months: 12, actual_months: 17, sites: 44, screen_fail_rate: 0.14, amendments: 3, status: 'Completed' },
  { trial_id: 'CT-RSV-309', indication: 'RSV', phase: 'III', title: 'RSV in adults 50–59 at increased risk', planned_enrollment: 1520, actual_enrollment: 1544, planned_months: 9, actual_months: 9, sites: 38, screen_fail_rate: 0.09, amendments: 1, status: 'Completed' },
  { trial_id: 'CT-RSV-205', indication: 'RSV', phase: 'II', title: 'RSV OA dose ranging', planned_enrollment: 1000, actual_enrollment: 1005, planned_months: 7, actual_months: 8, sites: 22, screen_fail_rate: 0.1, amendments: 1, status: 'Completed' },
  { trial_id: 'CT-COPD-201', indication: 'COPD', phase: 'II', title: 'Anti-IL5 in eosinophilic COPD', planned_enrollment: 600, actual_enrollment: 512, planned_months: 18, actual_months: 26, sites: 96, screen_fail_rate: 0.38, amendments: 4, status: 'Completed' },
  { trial_id: 'CT-COPD-203', indication: 'COPD', phase: 'II', title: 'Inhaled PDE4 inhibitor, exacerbations', planned_enrollment: 480, actual_enrollment: 470, planned_months: 14, actual_months: 16, sites: 61, screen_fail_rate: 0.31, amendments: 2, status: 'Completed' },
  { trial_id: 'CT-COPD-204', indication: 'COPD', phase: 'II', title: 'Triple therapy step-down', planned_enrollment: 720, actual_enrollment: 598, planned_months: 16, actual_months: 22, sites: 88, screen_fail_rate: 0.42, amendments: 3, status: 'Terminated early' },
  { trial_id: 'CT-COPD-206', indication: 'COPD', phase: 'II', title: 'Biologic add-on, frequent exacerbators', planned_enrollment: 540, actual_enrollment: 541, planned_months: 15, actual_months: 17, sites: 70, screen_fail_rate: 0.35, amendments: 2, status: 'Completed' },
  { trial_id: 'CT-COPD-301', indication: 'COPD', phase: 'III', title: 'Once-daily triple therapy', planned_enrollment: 10000, actual_enrollment: 10355, planned_months: 24, actual_months: 27, sites: 1070, screen_fail_rate: 0.29, amendments: 3, status: 'Completed' },
  { trial_id: 'CT-HZ-301', indication: 'Herpes zoster', phase: 'III', title: 'Recombinant zoster vaccine, adults 50+', planned_enrollment: 16000, actual_enrollment: 15411, planned_months: 20, actual_months: 22, sites: 229, screen_fail_rate: 0.06, amendments: 2, status: 'Completed' },
];

export interface SiteSeed {
  site_id: string;
  name: string;
  city: string;
  country: string;
  region: string;
  investigator: string;
  therapeutic_areas: string;
  enrollment_rate: number; // participants per site per month, historical
  screen_fail_rate: number;
  diversity_index: number; // 0..1, share of enrolled participants from under-represented groups
  pct_black: number;
  pct_hispanic: number;
  pct_asian: number;
  pct_over65: number;
  last_inspection: string;
  inspection_outcome: 'NAI' | 'VAI' | 'OAI';
  active_trials: number;
}

export const SITES: SiteSeed[] = [
  { site_id: 'S-US-014', name: 'Piedmont Research Center', city: 'Atlanta', country: 'US', region: 'North America', investigator: 'Dr. A. Mensah', therapeutic_areas: 'Vaccines,Respiratory', enrollment_rate: 21.4, screen_fail_rate: 0.07, diversity_index: 0.58, pct_black: 0.41, pct_hispanic: 0.09, pct_asian: 0.04, pct_over65: 0.52, last_inspection: '2025-11', inspection_outcome: 'NAI', active_trials: 6 },
  { site_id: 'S-US-022', name: 'Rio Grande Clinical Trials', city: 'San Antonio', country: 'US', region: 'North America', investigator: 'Dr. L. Garza', therapeutic_areas: 'Vaccines,Respiratory', enrollment_rate: 18.9, screen_fail_rate: 0.09, diversity_index: 0.62, pct_black: 0.07, pct_hispanic: 0.52, pct_asian: 0.03, pct_over65: 0.47, last_inspection: '2025-06', inspection_outcome: 'NAI', active_trials: 5 },
  { site_id: 'S-US-031', name: 'Lakeshore Medical Research', city: 'Chicago', country: 'US', region: 'North America', investigator: 'Dr. P. Novak', therapeutic_areas: 'Respiratory', enrollment_rate: 15.2, screen_fail_rate: 0.12, diversity_index: 0.44, pct_black: 0.26, pct_hispanic: 0.14, pct_asian: 0.04, pct_over65: 0.39, last_inspection: '2024-09', inspection_outcome: 'VAI', active_trials: 8 },
  { site_id: 'S-US-047', name: 'Bay Area Vaccine Unit', city: 'Oakland', country: 'US', region: 'North America', investigator: 'Dr. K. Tanaka', therapeutic_areas: 'Vaccines', enrollment_rate: 17.8, screen_fail_rate: 0.06, diversity_index: 0.51, pct_black: 0.16, pct_hispanic: 0.14, pct_asian: 0.21, pct_over65: 0.44, last_inspection: '2025-03', inspection_outcome: 'NAI', active_trials: 4 },
  { site_id: 'S-US-053', name: 'Gulf Coast Research Partners', city: 'Houston', country: 'US', region: 'North America', investigator: 'Dr. R. Okoye', therapeutic_areas: 'Vaccines,Respiratory', enrollment_rate: 23.1, screen_fail_rate: 0.1, diversity_index: 0.55, pct_black: 0.28, pct_hispanic: 0.24, pct_asian: 0.03, pct_over65: 0.41, last_inspection: '2023-12', inspection_outcome: 'OAI', active_trials: 7 },
  { site_id: 'S-US-066', name: 'Heartland Senior Health', city: 'Kansas City', country: 'US', region: 'North America', investigator: 'Dr. M. Brennan', therapeutic_areas: 'Vaccines', enrollment_rate: 12.6, screen_fail_rate: 0.05, diversity_index: 0.22, pct_black: 0.14, pct_hispanic: 0.05, pct_asian: 0.02, pct_over65: 0.71, last_inspection: '2025-08', inspection_outcome: 'NAI', active_trials: 3 },
  { site_id: 'S-US-072', name: 'Mid-Atlantic Pulmonary Institute', city: 'Baltimore', country: 'US', region: 'North America', investigator: 'Dr. S. Adeyemi', therapeutic_areas: 'Respiratory', enrollment_rate: 9.8, screen_fail_rate: 0.33, diversity_index: 0.49, pct_black: 0.39, pct_hispanic: 0.05, pct_asian: 0.05, pct_over65: 0.46, last_inspection: '2025-01', inspection_outcome: 'NAI', active_trials: 5 },
  { site_id: 'S-US-081', name: 'Desert Sun Clinical', city: 'Phoenix', country: 'US', region: 'North America', investigator: 'Dr. J. Alvarez', therapeutic_areas: 'Vaccines,Respiratory', enrollment_rate: 19.7, screen_fail_rate: 0.08, diversity_index: 0.47, pct_black: 0.05, pct_hispanic: 0.38, pct_asian: 0.03, pct_over65: 0.56, last_inspection: '2024-05', inspection_outcome: 'VAI', active_trials: 6 },
  { site_id: 'S-CA-005', name: 'Toronto Vaccine Evaluation Centre', city: 'Toronto', country: 'CA', region: 'North America', investigator: 'Dr. H. Singh', therapeutic_areas: 'Vaccines', enrollment_rate: 14.3, screen_fail_rate: 0.07, diversity_index: 0.46, pct_black: 0.09, pct_hispanic: 0.03, pct_asian: 0.31, pct_over65: 0.48, last_inspection: '2025-04', inspection_outcome: 'NAI', active_trials: 4 },
  { site_id: 'S-UK-011', name: 'Midlands Clinical Research Facility', city: 'Birmingham', country: 'UK', region: 'Europe', investigator: 'Dr. N. Patel', therapeutic_areas: 'Vaccines,Respiratory', enrollment_rate: 13.9, screen_fail_rate: 0.09, diversity_index: 0.41, pct_black: 0.12, pct_hispanic: 0.01, pct_asian: 0.26, pct_over65: 0.43, last_inspection: '2025-02', inspection_outcome: 'NAI', active_trials: 7 },
  { site_id: 'S-UK-019', name: 'Northern Respiratory Unit', city: 'Manchester', country: 'UK', region: 'Europe', investigator: 'Dr. C. Whitaker', therapeutic_areas: 'Respiratory', enrollment_rate: 8.7, screen_fail_rate: 0.29, diversity_index: 0.24, pct_black: 0.06, pct_hispanic: 0.01, pct_asian: 0.14, pct_over65: 0.51, last_inspection: '2024-10', inspection_outcome: 'NAI', active_trials: 4 },
  { site_id: 'S-DE-008', name: 'Charité Studienzentrum', city: 'Berlin', country: 'DE', region: 'Europe', investigator: 'Dr. F. Weber', therapeutic_areas: 'Vaccines,Respiratory', enrollment_rate: 12.1, screen_fail_rate: 0.1, diversity_index: 0.18, pct_black: 0.03, pct_hispanic: 0.02, pct_asian: 0.06, pct_over65: 0.54, last_inspection: '2025-05', inspection_outcome: 'NAI', active_trials: 9 },
  { site_id: 'S-ES-004', name: 'Hospital Clínic Research Unit', city: 'Barcelona', country: 'ES', region: 'Europe', investigator: 'Dr. M. Puig', therapeutic_areas: 'Vaccines', enrollment_rate: 11.4, screen_fail_rate: 0.08, diversity_index: 0.21, pct_black: 0.02, pct_hispanic: 0.11, pct_asian: 0.04, pct_over65: 0.57, last_inspection: '2024-12', inspection_outcome: 'NAI', active_trials: 5 },
  { site_id: 'S-PL-003', name: 'Warsaw Clinical Trials Centre', city: 'Warsaw', country: 'PL', region: 'Europe', investigator: 'Dr. K. Nowak', therapeutic_areas: 'Respiratory,Vaccines', enrollment_rate: 16.4, screen_fail_rate: 0.19, diversity_index: 0.08, pct_black: 0.01, pct_hispanic: 0.0, pct_asian: 0.01, pct_over65: 0.49, last_inspection: '2023-09', inspection_outcome: 'VAI', active_trials: 11 },
  { site_id: 'S-BR-007', name: 'Instituto de Pesquisa Clínica', city: 'São Paulo', country: 'BR', region: 'Latin America', investigator: 'Dr. R. Oliveira', therapeutic_areas: 'Vaccines,Respiratory', enrollment_rate: 20.3, screen_fail_rate: 0.11, diversity_index: 0.63, pct_black: 0.34, pct_hispanic: 0.0, pct_asian: 0.05, pct_over65: 0.38, last_inspection: '2025-07', inspection_outcome: 'NAI', active_trials: 6 },
  { site_id: 'S-MX-002', name: 'Centro de Investigación Monterrey', city: 'Monterrey', country: 'MX', region: 'Latin America', investigator: 'Dr. E. Treviño', therapeutic_areas: 'Vaccines', enrollment_rate: 17.2, screen_fail_rate: 0.1, diversity_index: 0.59, pct_black: 0.01, pct_hispanic: 0.94, pct_asian: 0.0, pct_over65: 0.33, last_inspection: '2024-11', inspection_outcome: 'NAI', active_trials: 4 },
  { site_id: 'S-JP-012', name: 'Tokyo Vaccine Research Clinic', city: 'Tokyo', country: 'JP', region: 'Asia-Pacific', investigator: 'Dr. Y. Sato', therapeutic_areas: 'Vaccines', enrollment_rate: 10.6, screen_fail_rate: 0.05, diversity_index: 0.12, pct_black: 0.0, pct_hispanic: 0.0, pct_asian: 0.99, pct_over65: 0.62, last_inspection: '2025-02', inspection_outcome: 'NAI', active_trials: 3 },
  { site_id: 'S-KR-006', name: 'Seoul Clinical Trial Center', city: 'Seoul', country: 'KR', region: 'Asia-Pacific', investigator: 'Dr. J. Park', therapeutic_areas: 'Vaccines,Respiratory', enrollment_rate: 15.9, screen_fail_rate: 0.07, diversity_index: 0.1, pct_black: 0.0, pct_hispanic: 0.0, pct_asian: 0.99, pct_over65: 0.45, last_inspection: '2025-06', inspection_outcome: 'NAI', active_trials: 8 },
  { site_id: 'S-AU-003', name: 'Southern Cross Research', city: 'Melbourne', country: 'AU', region: 'Asia-Pacific', investigator: 'Dr. T. O’Brien', therapeutic_areas: 'Respiratory', enrollment_rate: 9.4, screen_fail_rate: 0.27, diversity_index: 0.27, pct_black: 0.02, pct_hispanic: 0.01, pct_asian: 0.2, pct_over65: 0.47, last_inspection: '2024-08', inspection_outcome: 'NAI', active_trials: 3 },
  { site_id: 'S-ZA-001', name: 'Soweto Clinical Research Site', city: 'Johannesburg', country: 'ZA', region: 'Africa', investigator: 'Dr. T. Dlamini', therapeutic_areas: 'Vaccines', enrollment_rate: 18.4, screen_fail_rate: 0.12, diversity_index: 0.78, pct_black: 0.93, pct_hispanic: 0.0, pct_asian: 0.01, pct_over65: 0.29, last_inspection: '2025-03', inspection_outcome: 'NAI', active_trials: 5 },
];

export interface SafetySeed {
  finding_id: string;
  site_id: string;
  severity: 'Minor' | 'Major' | 'Critical';
  summary: string;
  opened: string;
  status: 'Open' | 'Closed';
}

export const SAFETY_FINDINGS: SafetySeed[] = [
  { finding_id: 'SF-2291', site_id: 'S-US-053', severity: 'Critical', summary: 'SAE reporting beyond 24h on 3 occasions', opened: '2023-12-04', status: 'Open' },
  { finding_id: 'SF-2304', site_id: 'S-US-031', severity: 'Major', summary: 'Informed consent version mismatch for 2 participants', opened: '2024-09-18', status: 'Open' },
  { finding_id: 'SF-2317', site_id: 'S-PL-003', severity: 'Major', summary: 'Cold-chain excursion not documented', opened: '2025-05-02', status: 'Open' },
  { finding_id: 'SF-2320', site_id: 'S-US-081', severity: 'Minor', summary: 'Delegation log signature missing', opened: '2024-05-21', status: 'Closed' },
  { finding_id: 'SF-2342', site_id: 'S-BR-007', severity: 'Minor', summary: 'Late source-data entry (>5 days)', opened: '2025-08-11', status: 'Open' },
  { finding_id: 'SF-2356', site_id: 'S-UK-011', severity: 'Minor', summary: 'Temperature log gap, 6h', opened: '2025-02-27', status: 'Closed' },
];

export interface LibrarySeed {
  doc_id: string;
  title: string;
  source: string;
  kind: 'Regulatory guidance' | 'Epidemiology' | 'SOP';
  version: string;
  summary: string;
  key_requirements: string[];
}

// Summaries are paraphrased mock text for the prototype, not the documents' actual wording.
export const LIBRARY: LibrarySeed[] = [
  { doc_id: 'LIB-ICH-E9R1', title: 'ICH E9(R1): Estimands and sensitivity analysis', source: 'ICH', kind: 'Regulatory guidance', version: 'Step 4', summary: 'Defines the estimand framework: treatment, population, variable, intercurrent events and population-level summary.', key_requirements: ['State each estimand’s five attributes', 'Name a strategy for every intercurrent event', 'Align sensitivity analyses to the estimand'] },
  { doc_id: 'LIB-ICH-E6R3', title: 'ICH E6(R3): Good Clinical Practice', source: 'ICH', kind: 'Regulatory guidance', version: 'Step 4', summary: 'Risk-proportionate GCP: quality by design, sponsor oversight of sites, data integrity.', key_requirements: ['Risk-based site selection and oversight', 'Document critical-to-quality factors'] },
  { doc_id: 'LIB-FDA-DAP', title: 'FDA draft guidance: Diversity Action Plans', source: 'FDA', kind: 'Regulatory guidance', version: 'Draft (status to confirm)', summary: 'Sponsors set enrollment goals by race, ethnicity, sex and age group, with rationale and a plan to meet them.', key_requirements: ['Enrollment goals by group with rationale', 'Tactics to reach the goals', 'Monitor progress during enrollment'] },
  { doc_id: 'LIB-CFR-P11', title: '21 CFR Part 11: Electronic records and signatures', source: 'FDA', kind: 'Regulatory guidance', version: 'Current', summary: 'Electronic signatures show printed name, date/time and meaning; records keep a secure, time-stamped audit trail.', key_requirements: ['Signature manifestation: name, date/time, meaning', 'Computer-generated audit trail', 'Signatures linked to their records'] },
  { doc_id: 'LIB-EPI-RSV', title: 'RSV burden in adults 60+ by group (mock)', source: 'GSK Epidemiology', kind: 'Epidemiology', version: '2026.1', summary: 'Share of RSV hospitalisation burden in US adults 60+ by group.', key_requirements: ['Black or African American: 16%', 'Hispanic or Latino: 13%', 'Asian: 5%', 'Aged 75+: 44%'] },
  { doc_id: 'LIB-EPI-COPD', title: 'COPD exacerbation burden by group (mock)', source: 'GSK Epidemiology', kind: 'Epidemiology', version: '2026.1', summary: 'Share of moderate-to-severe exacerbation burden by group.', key_requirements: ['Black or African American: 12%', 'Hispanic or Latino: 9%', 'Asian: 4%', 'Aged 65+: 58%'] },
  { doc_id: 'LIB-SOP-SITE', title: 'GSK SOP: Site feasibility and selection (simulated)', source: 'GSK Clinical Operations', kind: 'SOP', version: '4.2', summary: 'Exclude sites with an OAI inspection outcome or an open critical finding; weigh enrolment, quality and diversity.', key_requirements: ['No OAI sites', 'No open critical safety findings', 'Site Selection Lead approves before contact'] },
  { doc_id: 'LIB-SOP-DIV', title: 'GSK SOP: Diversity plan authoring (simulated)', source: 'GSK Clinical Operations', kind: 'SOP', version: '2.0', summary: 'Goals must be traceable to epidemiology; tactics must name sites and community partners.', key_requirements: ['Goals traceable to epidemiology', 'Tactics tied to named sites', 'Patient Diversity Lead approves'] },
];

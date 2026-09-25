// Orchestrator + workstream state machines, running in the browser. Scripted agents over seeded
// mock systems of record; a ticker advances whatever is due. Same rules as the server version:
// named-reviewer gates, request-changes loops, hash-chained audit log, and a lock on release.
import { PRESETS, PROGRAM_LEAD, WORKSTREAMS, wsMeta, type Decision, type EventRow, type RunDetail, type RunRow, type RunStatus, type SourceUse, type WsKey } from '../../../../shared/feasibility';
import { S, appendAudit, canonical, ctms, db, docRepo, event, library, nowIso, save, sha256, siteDb, type Finding, type Site, type Step, type WsRecord } from './store';

type Kind = EventRow['kind'];
type Out = Record<string, unknown>;
interface Produced {
  output: Out;
  sources: SourceUse[];
  artifact_ref: string | null;
  steps: Step[];
}

// The signed-in person is not known in a front-end-only build; signatures record this instead.
export const SESSION_USER = 'browser session (prototype)';

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x: number) => `${Math.round(x * 100).toString()}%`;
const r1 = (x: number) => Math.round(x * 10) / 10;
const areaFor = (indication: string) => (indication === 'COPD' ? 'Respiratory' : 'Vaccines');

// ── Agents (scripted reasoning over real seeded data) ─────────────────────────
function protocolAgent(run: RunRow): Produced {
  const trials = ctms.trials(run.indication);
  const comps = trials.filter((t) => t.phase === run.phase).length >= 3 ? trials.filter((t) => t.phase === run.phase) : trials;
  const enrol = median(comps.map((t) => t.actual_enrollment / t.planned_enrollment));
  const overrun = median(comps.map((t) => t.actual_months / t.planned_months - 1));
  const sf = mean(comps.map((t) => t.screen_fail_rate));
  const amend = mean(comps.map((t) => t.amendments));
  const terminated = comps.filter((t) => t.status !== 'Completed').length;
  const parts = { enrolment: 0.35 * Math.min(1, enrol), timeline: 0.25 * Math.max(0, 1 - overrun * 2), screening: 0.2 * Math.max(0, 1 - sf * 1.5), stability: 0.2 * Math.max(0, 1 - amend / 5) };
  const score = Math.round(100 * Object.values(parts).reduce((a, b) => a + b, 0));
  const months = Math.round(median(comps.map((t) => t.actual_months)) * Math.pow(run.target_enrollment / median(comps.map((t) => t.planned_enrollment)), 0.25));
  const risks = [
    ...(sf > 0.25 ? [`High screen failure in comparables (${pct(sf)}): tighten eligibility or pre-screen`] : []),
    ...(overrun > 0.15 ? [`Comparables ran ${pct(overrun)} over plan: add contingency to the timeline`] : []),
    ...(amend > 2 ? [`${r1(amend).toString()} amendments per trial on average: lock the protocol earlier`] : []),
    ...(terminated ? [`${terminated.toString()} comparable trial(s) terminated early`] : []),
  ];
  if (risks.length === 0) risks.push('No major feasibility risks in comparable trials');
  return {
    output: {
      score,
      band: score >= 75 ? 'Feasible' : score >= 55 ? 'Feasible with mitigations' : 'At risk',
      comparables: comps.map((t) => ({ trial_id: t.trial_id, title: t.title, enrolment: pct(t.actual_enrollment / t.planned_enrollment), duration: `${t.actual_months.toString()} / ${t.planned_months.toString()} mo`, screen_fail: pct(t.screen_fail_rate), amendments: t.amendments, status: t.status })),
      metrics: { 'Median enrolment vs plan': pct(enrol), 'Median timeline overrun': pct(overrun), 'Mean screen failure': pct(sf), 'Mean amendments': r1(amend) },
      components: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Math.round(v * 100)])),
      projected_months: months,
      risks,
    },
    sources: [{ system: 'CTMS', call: `GET /api/sor/ctms/trials?indication=${run.indication}`, records: comps.length, table: `${S}.ctms_trials`, ids: comps.map((t) => t.trial_id) }],
    artifact_ref: null,
    steps: [
      { ms: 900, kind: 'info', text: 'Loaded skill Protocol Feasibility Scoring v2.1' },
      { ms: 1400, kind: 'api', text: `GET /api/sor/ctms/trials?indication=${run.indication} → ${trials.length.toString()} trials, ${comps.length.toString()} comparable` },
      { ms: 2200, kind: 'info', text: 'Scored enrolment, timeline, screen failure and amendment burden' },
      { ms: 1200, kind: 'ok', text: `Feasibility ${score.toString()}/100 · autonomous, no gate` },
    ],
  };
}

function rankSites(sites: Site[], open: Finding[], strict: boolean) {
  const maxRate = Math.max(...sites.map((s) => s.enrollment_rate));
  const excluded: { site_id: string; name: string; reason: string }[] = [];
  const kept = sites.filter((s) => {
    const f = open.filter((x) => x.site_id === s.site_id);
    if (s.inspection_outcome === 'OAI') excluded.push({ site_id: s.site_id, name: s.name, reason: `OAI inspection (${s.last_inspection})${f.length ? `, open ${f.map((x) => `${x.severity.toLowerCase()} finding ${x.finding_id}`).join(', ')}` : ''}` });
    else if (f.some((x) => x.severity === 'Critical')) excluded.push({ site_id: s.site_id, name: s.name, reason: 'Open critical safety finding' });
    else if (strict && f.some((x) => x.severity === 'Major')) excluded.push({ site_id: s.site_id, name: s.name, reason: `Open major finding ${f.find((x) => x.severity === 'Major')?.finding_id ?? ''} (excluded on revision)` });
    else return true;
    return false;
  });
  const ranked = kept
    .map((s) => {
      const f = open.filter((x) => x.site_id === s.site_id);
      const score = 0.4 * (s.enrollment_rate / maxRate) + 0.25 * s.diversity_index + 0.2 * (1 - s.screen_fail_rate) + 0.15 * (s.inspection_outcome === 'NAI' ? 1 : 0.5) - 0.05 * f.length;
      return { s, f, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  return { ranked, excluded };
}

function sitesAgent(run: RunRow, attempt: number, feedback: string | null): Produced {
  const area = areaFor(run.indication);
  const sites = siteDb.sites(area);
  const open = siteDb.openFindings();
  const { ranked, excluded } = rankSites(sites, open, attempt > 1);
  return {
    output: {
      therapeutic_area: area,
      candidates: ranked.map(({ s, f, score }, i) => ({
        rank: i + 1,
        site_id: s.site_id,
        name: s.name,
        location: `${s.city}, ${s.country}`,
        investigator: s.investigator,
        score: Math.round(score * 100),
        enrolment_rate: s.enrollment_rate,
        diversity: pct(s.diversity_index),
        inspection: s.inspection_outcome,
        flags: [...f.map((x) => `${x.severity} finding ${x.finding_id}: ${x.summary}`), ...(s.inspection_outcome === 'VAI' ? ['VAI inspection: confirm CAPA closure'] : [])],
      })),
      excluded,
      projected_rate: r1(ranked.reduce((a, r) => a + r.s.enrollment_rate, 0)),
      ...(feedback ? { revision: { attempt, feedback, change: 'Excluded sites with open major findings; re-ranked' } } : {}),
    },
    sources: [
      { system: 'Site & safety database', call: `GET /api/sor/sites?area=${area}`, records: sites.length, table: `${S}.sites`, ids: sites.map((s) => s.site_id) },
      { system: 'Site & safety database', call: 'GET /api/sor/safety-findings?status=Open', records: open.length, table: `${S}.safety_findings`, ids: open.map((f) => f.finding_id) },
    ],
    artifact_ref: null,
    steps: [
      { ms: 800, kind: 'info', text: attempt > 1 ? `Attempt ${attempt.toString()}: applying reviewer feedback` : 'Loaded skill Site Selection Criteria v3.0' },
      { ms: 1500, kind: 'api', text: `GET /api/sor/sites?area=${area} → ${sites.length.toString()} sites` },
      { ms: 1300, kind: 'api', text: `GET /api/sor/safety-findings?status=Open → ${open.length.toString()} open findings` },
      ...excluded.map((e) => ({ ms: 700, kind: 'warn' as Kind, text: `Excluded ${e.site_id} ${e.name}: ${e.reason}` })),
      { ms: 1600, kind: 'info', text: `Ranked ${ranked.length.toString()} candidates by enrolment, quality and diversity` },
      { ms: 900, kind: 'gate', text: `Waiting for ${wsMeta('sites').gate?.role ?? ''} (${wsMeta('sites').gate?.name ?? ''})` },
    ],
  };
}

const EPI: Record<string, string> = { RSV: 'LIB-EPI-RSV', COPD: 'LIB-EPI-COPD' };
const COMMUNITY: Record<string, string> = { Black: 'Faith-based health ministries network (Atlanta, Houston)', Hispanic: 'Promotoras de salud programme (San Antonio, Phoenix)', Asian: 'In-language outreach with community health centres (Oakland, Toronto)', Older: 'Senior living and primary-care referral partnerships' };

function diversityAgent(run: RunRow, attempt: number, feedback: string | null): Produced {
  const docs = library.get([EPI[run.indication] ?? 'LIB-EPI-RSV', 'LIB-FDA-DAP', 'LIB-SOP-DIV']);
  const epi = docs.find((d) => d.kind === 'Epidemiology');
  const share = (label: string) => Number(/(\d+)%/.exec(epi?.key_requirements.find((k) => k.startsWith(label)) ?? '')?.[1] ?? 0) / 100;
  // Project the enrolment mix from the same ranked candidate list the Site Selection Agent drafts.
  const sites = siteDb.sites(areaFor(run.indication));
  const us = rankSites(sites, siteDb.openFindings(), false).ranked.map((r) => r.s);
  const w = us.reduce((a, s) => a + s.enrollment_rate, 0);
  // Enrolment historically converts about 60% of a site's catchment share for under-represented groups (mock factor);
  // 75+ is roughly half of a site's 65+ population.
  const factor = { pct_black: 0.6, pct_hispanic: 0.6, pct_asian: 0.6, pct_over65: 0.5 } as const;
  const proj = (k: keyof typeof factor) => (factor[k] * us.reduce((a, s) => a + s[k] * s.enrollment_rate, 0)) / w;
  const bump = attempt > 1 ? 0.02 : 0;
  const olderLabel = epi?.key_requirements.find((k) => k.startsWith('Aged'))?.split(':')[0] ?? 'Aged 65+';
  const groups = [
    { group: 'Black or African American', key: 'Black', epi: share('Black'), projected: proj('pct_black') },
    { group: 'Hispanic or Latino', key: 'Hispanic', epi: share('Hispanic'), projected: proj('pct_hispanic') },
    { group: 'Asian', key: 'Asian', epi: share('Asian'), projected: proj('pct_asian') },
    { group: olderLabel, key: 'Older', epi: share('Aged'), projected: proj('pct_over65') },
  ].map((g) => ({ ...g, goal: Math.round((g.epi + (g.projected < g.epi ? bump : 0)) * 100) / 100 }));
  const tactics = groups.flatMap((g) => {
    const best = [...us].sort((a, b) => (g.key === 'Black' ? b.pct_black - a.pct_black : g.key === 'Hispanic' ? b.pct_hispanic - a.pct_hispanic : g.key === 'Asian' ? b.pct_asian - a.pct_asian : b.pct_over65 - a.pct_over65)).slice(0, 2);
    return g.projected < g.goal ? [{ group: g.group, tactic: `${COMMUNITY[g.key]}; prioritise ${best.map((s) => s.name).join(' and ')}`, gap: pct(g.goal - g.projected) }] : [];
  });
  if (feedback) tactics.push({ group: 'Reviewer request', tactic: feedback, gap: '' });
  return {
    output: {
      scope: `Goals from US epidemiology. Projected mix from the ${us.length.toString()} ranked candidate sites, weighted by enrolment rate and adjusted for historical enrolment conversion (mock factor). Target ${run.target_enrollment.toLocaleString()} participants.`,
      goals: groups.map((g) => ({ group: g.group, epidemiology: pct(g.epi), projected_from_sites: pct(g.projected), goal: pct(g.goal), gap: g.projected < g.goal ? pct(g.goal - g.projected) : '—' })),
      tactics,
      monitoring: 'Weekly enrolment by group against goal; trigger site-level action if any group trails by more than 20% at 25% enrolment.',
      guidance: docs.map((d) => `${d.doc_id} · ${d.title} (${d.version})`),
      ...(feedback ? { revision: { attempt, feedback, change: 'Raised under-met goals by 2 points; added reviewer tactic' } } : {}),
    },
    sources: [
      { system: 'Protocol & regulatory library', call: `GET /api/sor/library?ids=${docs.map((d) => d.doc_id).join(',')}`, records: docs.length, table: `${S}.protocol_library`, ids: docs.map((d) => d.doc_id) },
      { system: 'Site & safety database', call: `GET /api/sor/sites?area=${areaFor(run.indication)} (demographics of ranked candidates)`, records: us.length, table: `${S}.sites`, ids: us.map((s) => s.site_id) },
    ],
    artifact_ref: null,
    steps: [
      { ms: 1000, kind: 'info', text: attempt > 1 ? `Attempt ${attempt.toString()}: applying reviewer feedback` : 'Loaded skill Patient Diversity Planning v1.6' },
      { ms: 1400, kind: 'api', text: `GET /api/sor/library/${epi?.doc_id ?? ''} → epidemiology by group` },
      { ms: 1200, kind: 'api', text: 'GET /api/sor/library/LIB-FDA-DAP, LIB-SOP-DIV → plan requirements' },
      { ms: 1500, kind: 'api', text: `GET /api/sor/sites?area=${areaFor(run.indication)} → demographics for ${us.length.toString()} candidate sites` },
      { ms: 1700, kind: 'info', text: `Set goals for ${groups.length.toString()} groups; ${tactics.length.toString()} tactics for gaps` },
      { ms: 900, kind: 'gate', text: `Waiting for ${wsMeta('diversity').gate?.role ?? ''} (${wsMeta('diversity').gate?.name ?? ''})` },
    ],
  };
}

const ESTIMAND: Record<string, { endpoint: string; population: string; treatment: string; ices: [string, string][]; summary: string }> = {
  RSV: {
    endpoint: 'First RT-PCR-confirmed RSV lower respiratory tract disease from 15 days post-vaccination through end of season 1',
    population: 'Adults aged 60 years and older, including those with stable chronic conditions',
    treatment: 'Single dose of investigational RSV vaccine vs placebo',
    ices: [
      ['Receipt of a licensed RSV vaccine', 'Hypothetical: as if not received'],
      ['Death from causes other than RSV', 'While alive'],
      ['Early withdrawal before end of season', 'Treatment policy'],
    ],
    summary: 'Vaccine efficacy = 1 − relative risk, with 95% CI',
  },
  COPD: {
    endpoint: 'Annualised rate of moderate or severe exacerbations over 52 weeks',
    population: 'Adults 40–80 with COPD, ≥2 moderate or ≥1 severe exacerbation in the prior year, eosinophils ≥300/µL',
    treatment: 'Investigational add-on vs placebo, on top of standard inhaled therapy',
    ices: [
      ['Discontinuation of study treatment', 'Treatment policy'],
      ['Initiation of a prohibited biologic', 'Hypothetical'],
      ['Death', 'Composite: counted as a severe exacerbation'],
    ],
    summary: 'Rate ratio vs placebo from a negative binomial model',
  },
};

function drafterAgent(run: RunRow, attempt: number, feedback: string | null): Produced {
  const [e9] = library.get(['LIB-ICH-E9R1']);
  const e = ESTIMAND[run.indication] ?? ESTIMAND.RSV;
  const docId = `${run.study_id}-SYN-${run.run_id.slice(-4).toUpperCase()}`;
  const content = [
    `# ${run.study_id} · Protocol synopsis and estimands (draft)`,
    `Compound: ${run.compound} · Phase ${run.phase} · Target N = ${run.target_enrollment.toLocaleString()}`,
    '',
    '## Primary objective',
    `To demonstrate the efficacy of ${run.compound} on: ${e.endpoint.toLowerCase()}.`,
    '',
    '## Primary estimand (ICH E9(R1))',
    `- Population: ${e.population}`,
    `- Treatment: ${e.treatment}`,
    `- Variable: ${e.endpoint}`,
    ...e.ices.map(([ice, strat]) => `- Intercurrent event: ${ice} → ${strat}`),
    `- Population-level summary: ${e.summary}`,
    ...(feedback ? ['', `## Revision ${attempt.toString()}`, `Addresses reviewer comment: “${feedback}”`] : []),
  ].join('\n');
  const v = docRepo.commit({ doc_id: docId, title: `${run.study_id} protocol synopsis and estimands`, run_id: run.run_id }, content, 'Clinical Drafter Agent', feedback ? `Revision for: ${feedback}` : 'Initial draft');
  return {
    output: {
      doc_id: docId,
      version: v.version,
      sha256: v.sha256,
      content,
      estimand: { population: e.population, treatment: e.treatment, variable: e.endpoint, intercurrent_events: e.ices.map(([event, strategy]) => ({ event, strategy })), summary: e.summary },
      checklist: e9?.key_requirements ?? [],
      ...(feedback ? { revision: { attempt, feedback, change: `New version v${v.version.toString()} committed` } } : {}),
    },
    sources: [
      { system: 'Protocol & regulatory library', call: 'GET /api/sor/library/LIB-ICH-E9R1', records: 1, table: `${S}.protocol_library`, ids: ['LIB-ICH-E9R1'] },
      { system: 'Document repository', call: `POST /api/sor/documents/${docId}/versions`, records: 1, table: `${S}.document_versions`, ids: [`${docId}@v${v.version.toString()}`] },
    ],
    artifact_ref: `${docId}@v${v.version.toString()}`,
    steps: [
      { ms: 1100, kind: 'info', text: attempt > 1 ? `Attempt ${attempt.toString()}: redrafting per reviewer` : 'Loaded skill Estimand Framing v1.2' },
      { ms: 1300, kind: 'api', text: 'GET /api/sor/library/LIB-ICH-E9R1 → estimand checklist' },
      { ms: 2400, kind: 'info', text: `Drafted synopsis and primary estimand (${e.ices.length.toString()} intercurrent events)` },
      { ms: 1200, kind: 'api', text: `POST /api/sor/documents/${docId}/versions → v${v.version.toString()} · sha256 ${v.sha256.slice(0, 12)}…` },
      { ms: 900, kind: 'gate', text: `Waiting for ${wsMeta('drafter').gate?.role ?? ''} (${wsMeta('drafter').gate?.name ?? ''})` },
    ],
  };
}

function produce(run: RunRow, ws: WsKey, attempt: number, feedback: string | null): Produced {
  if (ws === 'protocol') return protocolAgent(run);
  if (ws === 'sites') return sitesAgent(run, attempt, feedback);
  if (ws === 'diversity') return diversityAgent(run, attempt, feedback);
  return drafterAgent(run, attempt, feedback);
}


// ── Runs ──────────────────────────────────────────────────────────────────────
const getRun = (runId: string) => db.runs.find((r) => r.run_id === runId);
const getWs = (runId: string, ws: WsKey) => db.workstreams.find((w) => w.run_id === runId && w.ws_key === ws);

export function createRun(presetId: string, by: string): string {
  const p = PRESETS.find((x) => x.id === presetId) ?? PRESETS[0];
  const runId = `FE-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
  db.runs.push({ run_id: runId, study_id: p.studyId, compound: p.compound, indication: p.indication, phase: p.phase, title: p.title, target_enrollment: p.targetEnrollment, created_by: by, created_at: nowIso(), status: 'running', package_hash: null, released_at: null, released_by: null, locked: false });
  WORKSTREAMS.forEach((w, i) => {
    db.workstreams.push({ run_id: runId, ws_key: w.key, state: 'pending', attempt: 1, step: 0, next_at: Date.now() + 1200 + i * 450, output: null, output_hash: null, artifact_ref: null, sources: [], feedback: null, steps: null, updated_at: nowIso() });
  });
  event(runId, null, 'info', `Run created by ${by} for ${p.studyId} (${p.title})`);
  event(runId, null, 'info', 'Orchestrator dispatching 4 workstreams in parallel: 1 autonomous, 3 gated');
  save();
  return runId;
}

export function runDetail(runId: string): RunDetail | null {
  const run = getRun(runId);
  if (!run) return null;
  const order = WORKSTREAMS.map((w) => w.key);
  const workstreams = db.workstreams
    .filter((w) => w.run_id === runId)
    .sort((a, b) => order.indexOf(a.ws_key) - order.indexOf(b.ws_key))
    // In-progress output is the agent's scratch work; only show it once the agent has finished.
    .map((w) => ({ ws_key: w.ws_key, state: w.state, attempt: w.attempt, output: w.state === 'pending' || w.state === 'in_progress' ? null : w.output, output_hash: w.output_hash, artifact_ref: w.artifact_ref, sources: w.sources, feedback: w.feedback, updated_at: w.updated_at }));
  return {
    run: { ...run },
    workstreams: structuredClone(workstreams),
    events: db.events.filter((e) => e.run_id === runId).map(({ run_id: _r, ...e }) => e),
    audit: db.audit.filter((a) => a.run_id === runId).map((a) => ({ ...a })),
    contacted: db.contacts.filter((c) => c.run_id === runId).map((c) => c.site_id),
  };
}

export const listRuns = (): RunRow[] => [...db.runs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50);

function setStatus(runId: string) {
  const run = getRun(runId);
  if (!run || run.locked) return;
  const ws = db.workstreams.filter((w) => w.run_id === runId);
  let status: RunStatus = 'running';
  if (ws.some((w) => w.state === 'rejected')) status = 'blocked';
  else if (ws.every((w) => w.state === 'complete')) status = 'awaiting_release';
  else if (ws.some((w) => w.state === 'awaiting_approval')) status = 'awaiting_gates';
  if (status === run.status) return;
  if (status === 'awaiting_release') {
    run.package_hash = sha256(canonical(ws.map((w) => ({ ws: w.ws_key, hash: w.output_hash, ref: w.artifact_ref })).sort((a, b) => a.ws.localeCompare(b.ws))));
    event(runId, null, 'ok', `All 4 workstreams complete. Package assembled · sha256 ${run.package_hash.slice(0, 12)}… · waiting for ${PROGRAM_LEAD.role}`);
  }
  if (status === 'blocked') event(runId, null, 'deny', 'A gate was rejected. The package cannot be assembled until that workstream is re-run and approved.');
  run.status = status;
}

// ── Ticker ────────────────────────────────────────────────────────────────────
let started = false;
export function startTicker() {
  if (started) return;
  started = true;
  setInterval(() => {
    try {
      tick();
    } catch (e) {
      console.error('[feasibility] tick failed', e);
    }
  }, 400);
}

function tick() {
  const now = Date.now();
  const due = db.workstreams.filter((w) => ['pending', 'in_progress', 'approved'].includes(w.state) && w.next_at !== null && w.next_at <= now && !getRun(w.run_id)?.locked);
  if (due.length === 0) return;
  for (const w of due) advance(w);
  save();
}

function advance(w: WsRecord) {
  const run = getRun(w.run_id);
  if (!run) return;
  const meta = wsMeta(w.ws_key);
  w.updated_at = nowIso();
  if (w.state === 'approved') {
    const post: Record<WsKey, string> = { protocol: '', sites: 'Candidate sites unlocked for contact in the site database', diversity: 'Diversity plan registered against the study', drafter: 'Draft advanced: document status set to Approved' };
    if (w.ws_key === 'drafter' && w.artifact_ref) docRepo.setStatus(w.artifact_ref.split('@')[0], 'Approved');
    w.state = 'complete';
    w.next_at = null;
    event(w.run_id, w.ws_key, 'ok', `${post[w.ws_key]} · complete`);
    setStatus(w.run_id);
    return;
  }
  if (w.state === 'pending') {
    w.state = 'in_progress';
    w.step = 0;
    w.next_at = Date.now();
    event(w.run_id, w.ws_key, 'info', `${meta.agent} started`);
    return;
  }

  if (w.step === 0) {
    const out = produce(run, w.ws_key, w.attempt, w.feedback);
    w.output = out.output;
    w.output_hash = sha256(canonical(out.output));
    w.artifact_ref = out.artifact_ref;
    w.sources = out.sources;
    w.steps = out.steps;
  }
  const steps = w.steps ?? [];
  const s: Step = w.step < steps.length ? steps[w.step] : { ms: 0, kind: 'info', text: 'Resumed' };
  event(w.run_id, w.ws_key, s.kind, s.text);
  const next = w.step + 1;
  if (next < steps.length) {
    w.step = next;
    w.next_at = Date.now() + steps[next].ms;
    return;
  }
  w.state = meta.gate ? 'awaiting_approval' : 'complete';
  w.step = next;
  w.next_at = null;
  setStatus(w.run_id);
}

// ── Gates ─────────────────────────────────────────────────────────────────────
export class GateError extends Error {
  status: number;
  constructor(status: number, msg: string) {
    super(msg);
    this.status = status;
  }
}

const MEANING: Record<Decision, string> = { approve: 'Approved', reject: 'Rejected', request_changes: 'Changes requested' };

export function decide(runId: string, ws: WsKey, input: { decision: Decision; signature: string; comment: string; confirm: boolean }, authenticatedAs: string) {
  const meta = wsMeta(ws);
  const gate = meta.gate;
  if (!gate) throw new GateError(400, `${meta.agent} runs autonomously; there is no gate`);
  const run = getRun(runId);
  if (!run) throw new GateError(404, 'Run not found');
  if (run.locked) throw new GateError(409, 'This record is released and locked');
  const w = getWs(runId, ws);
  if (!w) throw new GateError(404, 'Workstream not found');
  if (w.state !== 'awaiting_approval') throw new GateError(409, `Nothing to sign: the workstream is ${w.state.replace('_', ' ')}`);
  if (!input.confirm) throw new GateError(400, 'Confirm that the typed name is your electronic signature');
  if (input.signature.trim().toLowerCase() !== gate.name.toLowerCase()) throw new GateError(403, `Signature must match the assigned reviewer, ${gate.name}`);
  if (input.decision !== 'approve' && input.comment.trim().length < 5) throw new GateError(400, 'A comment is required to reject or request changes');

  const rec = appendAudit({
    run_id: runId, ws_key: ws, record_type: 'gate_decision', reviewer: gate.name, role: gate.role, decision: input.decision,
    signature_meaning: MEANING[input.decision], signature_name: input.signature.trim(), comment: input.comment.trim(), authenticated_as: authenticatedAs,
    artifact_ref: w.artifact_ref ?? `${runId}/${ws}@attempt${w.attempt.toString()}`, artifact_hash: w.output_hash ?? '', attempt: w.attempt,
  });
  w.updated_at = nowIso();
  if (input.decision === 'approve') {
    w.state = 'approved';
    w.next_at = Date.now() + 1500;
  } else if (input.decision === 'reject') {
    w.state = 'rejected';
    w.next_at = null;
    w.feedback = input.comment.trim();
  } else {
    w.state = 'in_progress';
    w.attempt += 1;
    w.step = 0;
    w.feedback = input.comment.trim();
    w.next_at = Date.now() + 1200;
  }
  event(runId, ws, input.decision === 'approve' ? 'ok' : input.decision === 'reject' ? 'deny' : 'warn', `${MEANING[input.decision]} by ${gate.name} (${gate.role}) · audit #${rec.seq.toString()}${input.decision === 'request_changes' ? ' · agent redoing the step' : ''}`);
  setStatus(runId);
  save();
  return rec;
}

// A rejected workstream can be re-run from scratch (new attempt); the rejection stays in the audit log.
export function rerun(runId: string, ws: WsKey, by: string) {
  const run = getRun(runId);
  if (!run || run.locked) throw new GateError(409, 'This record is released and locked');
  const w = getWs(runId, ws);
  if (w?.state !== 'rejected') throw new GateError(409, 'Only a rejected workstream can be re-run');
  w.state = 'in_progress';
  w.attempt += 1;
  w.step = 0;
  w.next_at = Date.now() + 800;
  event(runId, ws, 'info', `Re-run requested by ${by}`);
  run.status = 'running';
  save();
}

export function release(runId: string, input: { signature: string; comment: string; confirm: boolean }, authenticatedAs: string) {
  const run = getRun(runId);
  if (!run) throw new GateError(404, 'Run not found');
  if (run.locked) throw new GateError(409, 'Already released and locked');
  if (run.status !== 'awaiting_release' || !run.package_hash) throw new GateError(409, 'All four workstreams must be complete first');
  if (!input.confirm) throw new GateError(400, 'Confirm that the typed name is your electronic signature');
  if (input.signature.trim().toLowerCase() !== PROGRAM_LEAD.name.toLowerCase()) throw new GateError(403, `Signature must match the ${PROGRAM_LEAD.role}, ${PROGRAM_LEAD.name}`);
  const rec = appendAudit({
    run_id: runId, ws_key: 'package', record_type: 'release', reviewer: PROGRAM_LEAD.name, role: PROGRAM_LEAD.role, decision: 'release',
    signature_meaning: 'Released', signature_name: input.signature.trim(), comment: input.comment.trim(), authenticated_as: authenticatedAs,
    artifact_ref: `${runId}/package`, artifact_hash: run.package_hash, attempt: 1,
  });
  event(runId, null, 'ok', `Released by ${PROGRAM_LEAD.name} (${PROGRAM_LEAD.role}) · audit #${rec.seq.toString()} · record locked`);
  run.status = 'released';
  run.released_at = nowIso();
  run.released_by = PROGRAM_LEAD.name;
  run.locked = true;
  save();
  return rec;
}

// Gate enforcement on a system-of-record write: sites can only be contacted after sign-off.
export function contactSite(runId: string, siteId: string, by: string) {
  const w = getWs(runId, 'sites');
  if (!w) throw new GateError(404, 'Run not found');
  if (w.state !== 'approved' && w.state !== 'complete') {
    event(runId, 'sites', 'deny', `Blocked: tried to mark ${siteId} contacted before ${wsMeta('sites').gate?.role ?? ''} sign-off`);
    save();
    throw new GateError(403, `Blocked by the gate: ${wsMeta('sites').gate?.name ?? ''} has not signed off the site list`);
  }
  const candidates = (w.output as { candidates?: { site_id: string }[] } | null)?.candidates ?? [];
  if (!candidates.some((c) => c.site_id === siteId)) throw new GateError(400, 'Site is not on the approved list');
  if (!db.contacts.some((c) => c.run_id === runId && c.site_id === siteId)) db.contacts.push({ run_id: runId, site_id: siteId, contacted_by: by, contacted_at: nowIso() });
  event(runId, 'sites', 'api', `POST /api/sor/sites/${siteId}/contact → marked contacted by ${by}`);
  save();
}

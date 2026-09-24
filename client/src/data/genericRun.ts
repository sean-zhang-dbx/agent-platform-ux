// Templated composer + run + report for any capability. The flagship keeps its hand-written script.
import { CAPABILITIES, CATALOG, podById, podMemberCount, roleAgentById, slug } from './estate';
import { SRA_ID, type Capability } from './capabilities';
import { COMPOSER_STEPS, RUN_SCRIPT, type ScriptStep } from './runScript';
import { ACCEPTANCE_RESULTS, REPORT } from './report';

const nameOf = (id: string) => CATALOG.find((s) => s.id === id)?.name ?? id;

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function matchCapability(text: string): Capability {
  const words = new Set(slug(text).split('-').filter((w) => w.length > 3));
  let best = CAPABILITIES[0];
  let score = -1;
  for (const c of CAPABILITIES) {
    if (c.status === 'Draft') continue;
    const s = slug(c.name)
      .split('-')
      .filter((w) => w.length > 3)
      .reduce((n, w) => n + (words.has(w) || [...words].some((x) => x.startsWith(w.slice(0, 5))) ? 1 : 0), 0);
    if (s > score) {
      score = s;
      best = c;
    }
  }
  return best;
}

export function composerSteps(c: Capability): { text: string; detail?: string }[] {
  if (c.id === SRA_ID) return COMPOSER_STEPS;
  const pod = c.podId ? podById(c.podId) : undefined;
  return [
    { text: 'Reading the request', detail: `intent: ${c.name.toLowerCase()} · domain: ${c.domain}` },
    { text: `Matched capability “${c.name}”`, detail: `${c.skills.length.toString()} skills · ${c.tools.length.toString()} tools · ${c.data.length.toString()} data sources` },
    { text: 'Pulling context from Genie Ontology', detail: `${c.ontology.length.toString()} snippets` },
    { text: `Using certified pod ${pod?.name ?? ''} ${pod?.version ?? ''}`, detail: `${(pod ? podMemberCount(pod) : 0).toString()} agents · ${pod?.autonomyTier ?? ''}` },
    { text: 'Pod draft ready for your review', detail: `about $${c.costPerRun.toFixed(2)} · approval required before anything is final` },
  ];
}

export function runScript(c: Capability): ScriptStep[] {
  if (c.id === SRA_ID) return RUN_SCRIPT;
  const pod = c.podId ? podById(c.podId) : undefined;
  const agents = (pod?.agentIds ?? []).map((id) => roleAgentById(id)).filter((a) => a !== undefined);
  const workers = agents.slice(0, -1);
  const drafter = agents[agents.length - 1];
  const h = hash(c.id);
  const denyAt = h % 3 === 0 ? h % Math.max(1, workers.length) : -1;
  const retryAt = h % 4 === 1 ? (h >> 3) % Math.max(1, workers.length) : -1;
  const steps: ScriptStep[] = [
    { at: 300, agent: 'orchestrator', kind: 'info', text: `Pod approved. Split into ${workers.length.toString()} parallel tasks.`, short: `Split into ${workers.length.toString()} tasks` },
    { at: 900, agent: 'orchestrator', kind: 'info', text: 'Dispatching in parallel.', short: `${workers.length.toString()} agents working in parallel` },
  ];
  let last = 0;
  workers.forEach((a, i) => {
    const t0 = 1400 + i * 250;
    const skill = nameOf(a.skills[0] ?? '');
    steps.push({ at: t0, agent: a.id, status: 'running', kind: 'info', text: `Loaded skill ${skill}`, short: 'Loaded skill' });
    const tool = a.tools[0] ? nameOf(a.tools[0]) : null;
    steps.push({ at: t0 + 1600, agent: a.id, kind: 'tool', text: tool ? `${tool} → ${(3 + ((h >> i) % 40)).toString()} records` : 'Reasoning over context', short: tool ? `${tool}` : 'Reasoning', cost: 0.01, tokens: 2400 });
    let t = t0 + 3200;
    if (i === denyAt) {
      steps.push({ at: t, agent: a.id, status: 'blocked', kind: 'deny', text: 'Tried to read a table outside its grants: DENIED. Logged to the audit trail.', short: 'Denied (logged)' });
      steps.push({ at: t + 1000, agent: 'orchestrator', kind: 'warn', text: `${a.name} was blocked. Routing around it.`, short: `Rerouted ${a.name}` });
      steps.push({ at: t + 1500, agent: a.id, status: 'running', kind: 'info', text: 'Continuing with granted sources only.', short: 'Rerouted' });
      t += 2200;
    }
    if (i === retryAt) {
      steps.push({ at: t, agent: a.id, status: 'retrying', kind: 'warn', text: 'Model call timed out (simulated). Retrying.', short: 'Timed out · retrying' });
      steps.push({ at: t + 1200, agent: a.id, status: 'running', kind: 'info', text: 'Retry succeeded.', short: 'Retry succeeded' });
      t += 1800;
    }
    const done = t + 1400 + (i % 3) * 500;
    steps.push({ at: done, agent: a.id, status: 'complete', kind: 'ok', text: `${skill}: findings ready.`, short: 'Done', cost: 0.02, tokens: 4800 });
    last = Math.max(last, done);
  });
  if (drafter) {
    steps.push({ at: last + 500, agent: 'orchestrator', kind: 'info', text: `All findings in. Handing off to ${drafter.name}.`, short: `Handing off to ${drafter.name}` });
    steps.push({ at: last + 900, agent: drafter.id, status: 'running', kind: 'info', text: `Loaded skill ${nameOf(drafter.skills[0] ?? '')}`, short: 'Loaded skill' });
    steps.push({ at: last + 3000, agent: drafter.id, kind: 'tool', text: 'Drafting the result, citing every claim', short: 'Drafting', cost: 0.05, tokens: 9800 });
    steps.push({ at: last + 4600, agent: drafter.id, status: 'complete', kind: 'ok', text: 'Draft written. It cannot be finalised without a person.', short: 'Done' });
    last += 4600;
  }
  steps.push({ at: last + 500, agent: 'orchestrator', kind: 'ok', text: 'Pod finished. Waiting for human approval.', short: 'Done · waiting for your sign-off', requestStatus: 'pending_approval' });
  return steps;
}

export function reportFor(c: Capability) {
  if (c.id === SRA_ID) return { recommendation: REPORT.recommendation, detail: REPORT.recommendationDetail, flags: REPORT.flags, checks: ACCEPTANCE_RESULTS };
  const h = hash(c.id);
  const flags = [
    { level: h % 2 === 0 ? 'blocking' : 'attention', text: `${c.data[0]?.name ?? 'Source data'} was last refreshed 3 days ago. Confirm before relying on it.` },
    { level: 'attention', text: `One finding relies on an inferred Genie Ontology snippet (authority ${(c.ontology[2]?.authority ?? 0.75).toFixed(2)}).` },
  ];
  return {
    recommendation: h % 2 === 0 ? 'HOLD · 1 BLOCKER' : 'READY FOR REVIEW',
    detail: `Drafted by the pod for “${c.name}”. Every claim is cited.`,
    flags,
    checks: c.checks.map((k) => ({ name: k.name, result: k.target })),
  };
}

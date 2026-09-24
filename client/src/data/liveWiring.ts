import type { AgentId } from './types';

// "In the live build" copy: how each piece would run for real with the AppKit agents plugin
// (@databricks/appkit/beta). The loader writes one agent.md package per agent from its manifest.
// Not the Supervisor API adapter: the Supervisor API (Beta) reaches end of life on 30 Sep 2026.
// Display text only; nothing here executes.
export const LIVE_MODEL = 'databricks-claude-sonnet-4-6';

export const AGENT_WIRING: Record<AgentId, string[]> = {
  clinical: [
    'config/agents/clinical-data-agent/agent.md  ← generated from agent.yaml',
    `endpoint: ${LIVE_MODEL}   (chat-completions, via AI Gateway)`,
    'body = role prompt + SKILL.md rd.clinical.clinical_summary_authoring@1.4',
    'tools: get_clinical_summary (UC function over managed MCP), clinical_trials_genie',
    'every tool call runs asUser(req): the agent sees only what the requester can',
  ],
  regintel: [
    'config/agents/regulatory-intel-agent/agent.md  ← generated from agent.yaml',
    `endpoint: ${LIVE_MODEL}   (chat-completions, via AI Gateway)`,
    'body = role prompt + SKILL.md rd.regulatory.precedent_analysis',
    'tools: regulatory_corpus (document search over demo.pharma.regulatory_docs)',
    'every tool call runs asUser(req)',
  ],
  quality: [
    'config/agents/quality-review-agent/agent.md  ← generated from agent.yaml',
    `endpoint: ${LIVE_MODEL}   (chat-completions, via AI Gateway)`,
    'body = role prompt + SKILL.md quality.review.quality_gate_assessment',
    'tools: check_deviation_status (UC function over managed MCP), quality_genie',
    'every tool call runs asUser(req)',
  ],
  drafter: [
    'config/agents/report-drafter/agent.md  ← generated from agent.yaml',
    `endpoint: ${LIVE_MODEL}   // no data tools`,
    'body = role prompt + SKILL.md rd.regulatory.readiness_report',
    "tool save_report_draft marked effect: 'write' → HITL approval gate on POST /chat",
  ],
};

export const WIRING_GAP =
  'Gap today: tool calls already run as the requesting user (asUser), but the agent has no identity of its own. In one app, every agent shares the app’s service principal. Separate identities mean one app per agent, or native agent identity (a product ask).';

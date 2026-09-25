// "In the live build" copy: how each piece would run for real with the AppKit agents plugin
// (@databricks/appkit/beta). The loader writes one agent.md package per agent from its manifest.
// Not the Supervisor API adapter: the Supervisor API (Beta) reaches end of life on 30 Sep 2026.
// Display text only; nothing here executes.
export const LIVE_MODEL = 'databricks-claude-sonnet-4-6';

export const AGENT_WIRING: Record<string, string[]> = {
  clinical: [
    'config/agents/csr-author-agent/agent.md  ← generated from agent.yaml',
    `endpoint: ${LIVE_MODEL}   (chat-completions, via AI Gateway)`,
    'body = role prompt + SKILL.md rd.clinical.csr_section_authoring@1.4',
    'tools: get_clinical_summary, save_csr_draft (UC functions over managed MCP), clinical_trials_genie',
    'every tool call runs asUser(req): the agent sees only what the requester can',
  ],
  regintel: [
    'config/agents/ha-response-agent/agent.md  ← generated from agent.yaml',
    `endpoint: ${LIVE_MODEL}   (chat-completions, via AI Gateway)`,
    'body = role prompt + SKILL.md rd.regulatory.ha_query_response_drafting',
    'tools: regulatory_corpus (prior Q&A / HAQ&R over demo.pharma.regulatory_docs)',
    'every tool call runs asUser(req)',
  ],
  quality: [
    'config/agents/qc-consistency-agent/agent.md  ← generated from agent.yaml',
    `endpoint: ${LIVE_MODEL}   (chat-completions, via AI Gateway)`,
    'body = role prompt + SKILL.md rd.regulatory.labeling_consistency_check',
    'tools: label_text_diff (UC function over managed MCP), clinical_trials_genie',
    'every tool call runs asUser(req)',
  ],
  drafter: [
    'config/agents/ectd-assembler/agent.md  ← generated from agent.yaml',
    `endpoint: ${LIVE_MODEL}   // no data tools`,
    'body = role prompt + SKILL.md rd.regulatory.ectd_module_mapping',
    "tool save_report_draft marked effect: 'write' → HITL approval gate on POST /chat",
  ],
};

export const WIRING_GAP =
  'Gap today: tool calls already run as the requesting user (asUser), but the agent has no identity of its own. In one app, every agent shares the app’s service principal. Separate identities mean one app per agent, or native agent identity (a product ask).';

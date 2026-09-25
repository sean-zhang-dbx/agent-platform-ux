export type Domain = string;
export type SkillType = 'UC Skill' | 'UC Function' | 'MCP Service' | 'Genie Agent' | 'Knowledge Assistant';
export type SkillStatus = 'Certified' | 'Under Review' | 'Sandbox';
export type GxpTier = 'Tier 0' | 'Tier 1' | 'Tier 2' | 'Tier 3';

export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  domain: Domain;
  owner: string;
  gxpTier: GxpTier;
  status: SkillStatus;
  version: string;
  ucPath: string;
  description: string;
  inputs: string;
  outputs: string;
  lastUsed: string;
  usageCount: number;
  runsOn?: string;
}

export type AgentId =
  | 'clinical'
  | 'regintel'
  | 'quality'
  | 'drafter'
  | 'it-intake'
  | 'it-knowledge'
  | 'it-automation'
  | 'it-escalation';

export type Layer = 'skill' | 'tool' | 'agent';

export function layerOf(type: SkillType): Layer {
  if (type === 'UC Skill') return 'skill';
  if (type === 'Genie Agent' || type === 'Knowledge Assistant') return 'agent';
  return 'tool';
}

export interface PodAgent {
  id: AgentId;
  name: string;
  role: string;
  servicePrincipal: string;
  skills: string[];
  tools: string[];
  calls: string[];
  can: string[];
  cannot: string[];
  model: string;
  avgTokens: number;
  avgCost: number;
}

export type PodStatus = 'Active' | 'Sandbox' | 'Suspended';

export interface Pod {
  id: string;
  name: string;
  domain: Domain;
  owner: string;
  autonomyTier: string;
  status: PodStatus;
  version: string;
  summary: string;
  agentNames: string[];
  lastRun: string;
  avgCostPerRun: number;
  runsThisMonth: number;
  demoReady: boolean;
}

export type AgentStatus = 'waiting' | 'running' | 'retrying' | 'blocked' | 'complete';

export type RequestStatus =
  | 'composing'
  | 'pod_review'
  | 'in_progress'
  | 'pending_approval'
  | 'completed'
  | 'rejected'
  | 'changes_requested';

export type LogKind = 'info' | 'tool' | 'warn' | 'deny' | 'ok';

export interface LogLine {
  id: number;
  at: string;
  agent: string; // agent id or 'orchestrator'
  kind: LogKind;
  text: string;
  short?: string;
  ms?: number; // offset from pod launch, for the timeline
}

export interface Decision {
  decision: 'approved' | 'rejected' | 'changes_requested';
  by: string;
  at: string;
  comment: string;
}

export interface WorkRequest {
  id: string;
  title: string;
  requestText: string;
  domain: Domain;
  urgency: 'Standard' | 'Urgent';
  requester: string;
  createdAt: string;
  podId: string;
  capabilityId: string;
  agentIds: string[];
  runMs: number;
  status: RequestStatus;
  composerStep: number;
  agentStatus: Record<string, AgentStatus>;
  selectedSkills: Record<string, string[]>;
  logs: LogLine[];
  cost: number;
  tokens: number;
  decision?: Decision;
  archived?: boolean;
}

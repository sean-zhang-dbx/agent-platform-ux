import { createContext, useCallback, useContext, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { SRP_ID } from '../data/pods';
import { SRA_ID } from '../data/capabilities';
import { type ScriptStep } from '../data/runScript';
import { CAPABILITIES, CATALOG, capabilityById, podById, roleAgentById } from '../data/estate';
import { composerSteps, matchCapability, runScript } from '../data/genericRun';
import { BASE_FEEDBACK, type VersionId } from '../data/podVersions';
import type { AgentStatus, Decision, LogLine, RequestStatus, Skill, WorkRequest } from '../data/types';
import type { Capability } from '../data/capabilities';

export const CURRENT_USER = 'RA Lead · Vaccines (you)';

function clock(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Everything each Northwind-built agent is given: skills, tools and the Databricks agents it works with.
function selectionFor(agentIds: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const id of agentIds) {
    const a = roleAgentById(id);
    out[id] = a ? [...a.skills, ...a.tools, ...a.calls] : [];
  }
  return out;
}

function statusFor(agentIds: string[], s: AgentStatus): Record<string, AgentStatus> {
  return Object.fromEntries(agentIds.map((id) => [id, s]));
}

function archived(
  p: Pick<WorkRequest, 'id' | 'title' | 'requestText' | 'domain' | 'urgency' | 'requester' | 'createdAt' | 'podId' | 'capabilityId' | 'status' | 'cost' | 'tokens' | 'decision'>,
): WorkRequest {
  const agentIds = podById(p.podId)?.agentIds ?? [];
  return { ...p, agentIds, runMs: 0, composerStep: 99, agentStatus: statusFor(agentIds, 'complete'), selectedSkills: selectionFor(agentIds), logs: [], archived: true };
}

const SEED_REQUESTS: WorkRequest[] = [
  archived({
    id: 'WR-1043', title: 'Assess submission readiness · NWP-1907733', requestText: 'Assess submission readiness for NWP-1907733 (Phase II).', domain: 'R&D Regulatory',
    urgency: 'Standard', requester: 'RA Lead · Oncology', createdAt: 'Yesterday, 15:48', podId: SRP_ID, capabilityId: SRA_ID, status: 'completed', cost: 0.39, tokens: 81200,
    decision: { decision: 'approved', by: 'RA Lead · Oncology', at: 'Yesterday, 16:12', comment: '' },
  }),
  archived({
    id: 'WR-1049', title: 'Draft a CSR section · NWV-305 §11', requestText: 'Draft CSR section 11 (efficacy evaluation) for NWV-305.', domain: 'R&D Clinical',
    urgency: 'Standard', requester: 'Medical Writing Lead', createdAt: 'Today, 08:02', podId: 'csr-authoring', capabilityId: 'draft-csr-section', status: 'pending_approval', cost: 1.72, tokens: 356000, decision: undefined,
  }),
  archived({
    id: 'WR-1050', title: 'Check promotional claims · HCP wave 3', requestText: 'Check wave 3 HCP email copy against approved claims before MLR.', domain: 'Commercial',
    urgency: 'Urgent', requester: 'Brand Manager', createdAt: 'Today, 08:40', podId: 'omnichannel', capabilityId: 'check-promo-claims', status: 'completed', cost: 0.28, tokens: 60400,
    decision: { decision: 'approved', by: 'MLR Reviewer', at: 'Today, 09:05', comment: '' },
  }),
];

interface State {
  skills: Skill[];
  requests: WorkRequest[];
  activeId: string | null;
  liveVersion: VersionId;
  feedback: number;
  certified: string[];
  customCaps: Capability[];
  nextId: number;
  nextLog: number;
}

const initialState: State = { skills: CATALOG, requests: SEED_REQUESTS, activeId: null, liveVersion: 'v1.3', feedback: BASE_FEEDBACK, certified: [], customCaps: [], nextId: 1051, nextLog: 1 };

type Action =
  | { type: 'reset' }
  | { type: 'create'; request: WorkRequest }
  | { type: 'composerAdvance'; id: string }
  | { type: 'setStatus'; id: string; status: RequestStatus }
  | { type: 'toggleSkill'; id: string; agent: string; skill: string }
  | { type: 'step'; id: string; step: ScriptStep; at: string }
  | { type: 'decide'; id: string; decision: Decision }
  | { type: 'setLive'; version: VersionId }
  | { type: 'certify'; skillId: string }
  | { type: 'newChat' }
  | { type: 'saveCapability'; cap: Capability };

function patch(state: State, id: string, fn: (r: WorkRequest) => WorkRequest): State {
  return { ...state, requests: state.requests.map((r) => (r.id === id ? fn(r) : r)) };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'reset':
      return initialState;
    case 'newChat':
      return { ...state, activeId: null };
    case 'saveCapability':
      return { ...state, customCaps: [action.cap, ...state.customCaps.filter((c) => c.id !== action.cap.id)] };
    case 'create':
      return { ...state, requests: [action.request, ...state.requests], activeId: action.request.id, nextId: state.nextId + 1 };
    case 'composerAdvance':
      return patch(state, action.id, (r) => ({ ...r, composerStep: r.composerStep + 1 }));
    case 'setStatus':
      return patch(state, action.id, (r) => ({ ...r, status: action.status }));
    case 'toggleSkill':
      return patch(state, action.id, (r) => {
        const current = r.selectedSkills[action.agent] ?? [];
        const next = current.includes(action.skill) ? current.filter((s) => s !== action.skill) : [...current, action.skill];
        return { ...r, selectedSkills: { ...r.selectedSkills, [action.agent]: next } };
      });
    case 'step': {
      const { step } = action;
      const withRequest = patch(state, action.id, (r) => {
        const logs: LogLine[] = step.text
          ? [...r.logs, { id: state.nextLog, at: action.at, agent: step.agent ?? 'orchestrator', kind: step.kind ?? 'info', text: step.text, short: step.short, ms: step.at }]
          : r.logs;
        const agentStatus = step.status && step.agent && step.agent !== 'orchestrator' ? { ...r.agentStatus, [step.agent]: step.status } : r.agentStatus;
        return { ...r, logs, agentStatus, cost: r.cost + (step.cost ?? 0), tokens: r.tokens + (step.tokens ?? 0), status: step.requestStatus ?? r.status };
      });
      return { ...withRequest, nextLog: state.nextLog + 1 };
    }
    case 'setLive':
      return { ...state, liveVersion: action.version };
    case 'certify':
      return {
        ...state,
        certified: [...state.certified, action.skillId],
        skills: state.skills.map((s) => (s.id === action.skillId ? { ...s, status: 'Certified' } : s)),
      };
    case 'decide':
      return patch({ ...state, feedback: state.feedback + (action.decision.decision === 'changes_requested' ? 1 : 0) }, action.id, (r) => ({
        ...r,
        decision: action.decision,
        status: action.decision.decision === 'approved' ? 'completed' : action.decision.decision === 'rejected' ? 'rejected' : 'changes_requested',
      }));
  }
}

export interface Toast {
  id: number;
  text: string;
}

// hold = the presenter stepped back, so don't auto-advance on live events.
export interface Presenter {
  on: boolean;
  step: number;
  hold: boolean;
}

interface Store {
  state: State;
  active: WorkRequest | null;
  submitRequest: (requestText: string, capabilityId?: string) => string;
  newChat: () => void;
  toggleSkill: (id: string, agent: string, skill: string) => void;
  approvePod: (id: string) => void;
  cancelRequest: (id: string) => void;
  decide: (id: string, decision: Decision['decision'], comment: string) => void;
  promote: () => void;
  rollback: () => void;
  certify: (skillId: string) => void;
  saveCapability: (cap: Capability, submit: boolean) => void;
  capabilities: Capability[];
  reset: () => void;
  toasts: Toast[];
  toast: (text: string) => void;
  presenter: Presenter;
  setPresenter: (p: Presenter) => void;
  domain: string;
  setDomain: (d: string) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [presenter, setPresenter] = useState<Presenter>({ on: false, step: 0, hold: false });
  const [domain, setDomain] = useState('all');
  const timers = useRef<number[]>([]);
  const toastSeq = useRef(0);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const toast = useCallback(
    (text: string) => {
      toastSeq.current += 1;
      const id = toastSeq.current;
      setToasts((t) => [...t, { id, text }]);
      later(3200, () => setToasts((t) => t.filter((x) => x.id !== id)));
    },
    [later],
  );

  const submitRequest = useCallback(
    (requestText: string, capabilityId?: string) => {
      const cap = (capabilityId ? capabilityById(capabilityId) : undefined) ?? matchCapability(requestText);
      const pod = cap.podId ? podById(cap.podId) : undefined;
      const agentIds = pod?.agentIds ?? [];
      const script = runScript(cap);
      const id = `WR-${state.nextId.toString()}`;
      const steps = composerSteps(cap);
      dispatch({
        type: 'create',
        request: {
          id,
          title: cap.id === SRA_ID ? 'Assess submission readiness · NWP-2894512' : `${cap.name} · ${cap.context[0]?.value ?? ''}`,
          requestText,
          domain: cap.domain,
          urgency: 'Standard',
          requester: CURRENT_USER,
          createdAt: `Today, ${clock().slice(0, 5)}`,
          podId: pod?.id ?? '',
          capabilityId: cap.id,
          agentIds,
          runMs: script[script.length - 1]?.at ?? 20000,
          status: 'composing',
          composerStep: 0,
          agentStatus: statusFor(agentIds, 'waiting'),
          selectedSkills: selectionFor(agentIds),
          logs: [],
          cost: 0,
          tokens: 0,
        },
      });
      steps.forEach((_, i) => later(600 + i * 700, () => dispatch({ type: 'composerAdvance', id })));
      later(600 + steps.length * 700, () => dispatch({ type: 'setStatus', id, status: 'pod_review' }));
      return id;
    },
    [later, state.nextId],
  );

  const approvePod = useCallback(
    (id: string) => {
      const r = state.requests.find((x) => x.id === id);
      const cap = r ? capabilityById(r.capabilityId) : undefined;
      if (!cap) return;
      dispatch({ type: 'setStatus', id, status: 'in_progress' });
      for (const step of runScript(cap)) later(step.at, () => dispatch({ type: 'step', id, step, at: clock() }));
    },
    [later, state.requests],
  );

  const cancelRequest = useCallback((id: string) => dispatch({ type: 'setStatus', id, status: 'rejected' }), []);
  const newChat = useCallback(() => dispatch({ type: 'newChat' }), []);

  const decide = useCallback<Store['decide']>(
    (id, decision, comment) => {
      dispatch({ type: 'decide', id, decision: { decision, by: CURRENT_USER, at: clock(), comment } });
      toast(decision === 'approved' ? 'Approved. E-signature recorded (simulated).' : decision === 'rejected' ? 'Rejected. Pod notified.' : 'Saved as feedback for the next pod version');
    },
    [toast],
  );

  const promote = useCallback(() => {
    dispatch({ type: 'setLive', version: 'v1.4' });
    toast('v1.4 is live. v1.3 kept for rollback.');
  }, [toast]);

  const rollback = useCallback(() => {
    dispatch({ type: 'setLive', version: 'v1.3' });
    toast('Rolled back to v1.3.');
  }, [toast]);

  const certify = useCallback(
    (skillId: string) => {
      dispatch({ type: 'certify', skillId });
      toast('Certified. It can now join Tier 1 and Tier 2 pods.');
    },
    [toast],
  );

  const saveCapability = useCallback(
    (cap: Capability, submit: boolean) => {
      dispatch({ type: 'saveCapability', cap: { ...cap, inReview: submit } });
      toast(submit ? `${cap.name} submitted for certification` : `${cap.name} saved as a draft`);
    },
    [toast],
  );

  const capabilities = useMemo(() => [...state.customCaps, ...CAPABILITIES], [state.customCaps]);

  const toggleSkill = useCallback((id: string, agent: string, skill: string) => dispatch({ type: 'toggleSkill', id, agent, skill }), []);

  const reset = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    dispatch({ type: 'reset' });
    setToasts([]);
    setPresenter((p) => ({ ...p, step: 0, hold: false }));
  }, []);

  const active = state.requests.find((r) => r.id === state.activeId) ?? null;

  const value = useMemo<Store>(
    () => ({ state, active, submitRequest, newChat, toggleSkill, approvePod, cancelRequest, decide, promote, rollback, certify, saveCapability, capabilities, reset, toasts, toast, presenter, setPresenter, domain, setDomain }),
    [state, active, submitRequest, newChat, toggleSkill, approvePod, cancelRequest, decide, promote, rollback, certify, saveCapability, capabilities, reset, toasts, toast, presenter, domain],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

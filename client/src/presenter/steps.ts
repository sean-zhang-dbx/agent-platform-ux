import { ESTATE_COUNTS } from '../data/estate';

export type StepAction = 'home' | 'capabilities' | 'agents' | 'chat' | 'submit' | 'approvePod' | 'versions' | 'governance' | 'catalog' | 'none';

export interface PresenterStep {
  title: string;
  action: StepAction; // what happens when this step is entered via Next
  say: string; // **bold** marks the phrase to land
  live: string;
}

export const PRESENTER_STEPS: PresenterStep[] = [
  {
    title: 'The workforce at a glance',
    action: 'home',
    say: `**${ESTATE_COUNTS.capabilities.toString()} capabilities, ${ESTATE_COUNTS.pods.toString()} pods, ${ESTATE_COUNTS.agents.toString()} agents** across ${ESTATE_COUNTS.domains.toString()} domains. One place to see what runs, what it costs, and what needs a person.`,
    live: 'Counts, runs and spend come from Unity Catalog, MLflow traces and AI Gateway usage tables.',
  },
  {
    title: 'A capability, not a skill',
    action: 'capabilities',
    say: 'Northwind’s asset is the **capability**: skills + data + context. The skill declares its controls; **the platform enforces them**.',
    live: 'Skills are UC Skills; data stays in Unity Catalog; context comes from Genie Ontology.',
  },
  {
    title: 'One kind of agent, one card',
    action: 'agents',
    say: 'Every agent has a card: **who it acts for**, and what it can reach for that person. **It never sees more than the person it acts for.** Switch the card to Sean and watch the access shrink.',
    live: 'One agent.yaml per agent. The loader writes the AppKit agent.md, the UC grants and the Gateway policy; tool calls run asUser().',
  },
  {
    title: 'Just ask',
    action: 'chat',
    say: 'The regulatory lead **just asks**, in plain language.',
    live: 'The chat calls a composer agent in the Databricks App.',
  },
  {
    title: 'The agent builds the pod',
    action: 'submit',
    say: 'It picks the capability, uses **only certified skills**, and drafts a pod.',
    live: 'The composer returns a pod config; the app builds the agents from it. Config, not code.',
  },
  {
    title: 'A person approves the pod',
    action: 'approvePod',
    say: '**Nothing runs until a person approves.** Then the agents work in parallel.',
    live: 'Sub-agent calls through the AI Gateway, traced end to end in MLflow.',
  },
  {
    title: 'Governance, live',
    action: 'none',
    say: 'The Quality agent reached outside its grants. **Denied, logged, rerouted.**',
    live: 'Unity Catalog returns PERMISSION_DENIED and the denial lands in the audit log.',
  },
  {
    title: 'The agent drafted it. You decide.',
    action: 'none',
    say: 'Every claim is cited and **checked by the platform**. The sign-off stays human.',
    live: 'MLflow scorers run the acceptance checks; an approval gate holds the draft.',
  },
  {
    title: 'Pods get better',
    action: 'versions',
    say: 'Corrections become a **tested new version**. Promoted with approval, rollback ready.',
    live: 'Prompt Registry versions + MLflow evaluation on a QA-owned held-out set.',
  },
  {
    title: 'Governed at scale',
    action: 'governance',
    say: 'Every capability shows what it is built on. **GxP work on Beta features is flagged**, not hidden.',
    live: 'Maturity comes from the platform catalogue; denials from the UC audit log; spend from AI Gateway.',
  },
  {
    title: 'Same wiring, any domain',
    action: 'catalog',
    say: 'Swap the domain. **The capabilities change. The wiring does not.**',
    live: 'Open gaps: capability object, declared-controls schema, native skill loading, pod registry.',
  },
];

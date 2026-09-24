import type { Skill, Layer } from '../data/types';
import { layerOf } from '../data/types';

// Categorical slots from the dataviz reference palette (validated light mode, all-pairs:
// CVD ΔE ≥ 9.2, normal ΔE ≥ 16.3). Aqua is < 3:1 on white, so every mark carries a text label.
export const KIT_COLOR = {
  skill: '#eb6834',
  tool: '#4a3aa7',
  agent: '#2a78d6',
  data: '#1baf7a',
} as const;

export type Kit = keyof typeof KIT_COLOR;

export const KIT_LABEL: Record<Kit, string> = {
  skill: 'Skill',
  tool: 'Tool',
  agent: 'Databricks agent',
  data: 'Data',
};

export function kitOf(s: Skill): Kit {
  const l: Layer = layerOf(s.type);
  return l;
}

const SHORT: Record<string, string> = {
  'Clinical Trials Genie Agent': 'Clinical Trials Genie',
  'Quality & Deviations Genie Agent': 'Quality Genie',
  'Regulatory Document Corpus': 'Regulatory Corpus (KA)',
  'Submission Readiness Report': 'Readiness Report',
  'Regulatory Precedent Analysis': 'Precedent Analysis',
  'Clinical Summary Authoring': 'Clinical Summary',
  'Quality Gate Assessment': 'Quality Gate',
  'check_deviation_status': 'check_deviation_status',
  'get_clinical_summary': 'get_clinical_summary',
};

export function shortName(name: string): string {
  return SHORT[name] ?? name;
}

export function Legend({ kits }: { kits: Kit[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ink-soft)]">
      {kits.map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIT_COLOR[k] }} />
          {KIT_LABEL[k]}
        </span>
      ))}
    </div>
  );
}

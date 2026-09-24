import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import type { Capability } from '../data/capabilities';
import { KIT_COLOR, Legend, shortName } from './palette';

// A capability as ingredients only: skills → tools → data. Agents are not part of it;
// they are what executes it. Hover a node to trace everything it touches.

interface Node {
  id: string;
  label: string;
  sub: string;
  col: number;
  color: string;
}

const COL_X = [20, 360, 700];
const NODE_W = 280;
const NODE_H = 44;
const ROW = 58;
const TOP = 40;
const HEADERS = ['Skills · how', 'Tools · actions', 'Data · evidence'];

export function LinkMap({ capability }: { capability: Capability }) {
  const { state } = useStore();
  const [hover, setHover] = useState<string | null>(null);

  const nodes = useMemo(() => {
    const byId = (id: string) => state.skills.find((s) => s.id === id);
    const out: Node[] = [];
    for (const id of capability.skills) {
      const s = byId(id);
      if (s) out.push({ id, label: shortName(s.name), sub: s.owner, col: 0, color: KIT_COLOR.skill });
    }
    for (const id of capability.tools) {
      const s = byId(id);
      if (s) out.push({ id, label: s.name, sub: s.type, col: 1, color: KIT_COLOR.tool });
    }
    for (const d of capability.data) out.push({ id: d.id, label: d.name, sub: d.ref, col: 2, color: KIT_COLOR.data });
    return out;
  }, [capability, state.skills]);

  const edges = capability.links;
  // Row-align each chain with the skill that starts it, so a skill that reads data directly
  // passes through an empty tool slot instead of behind another box.
  const rowOf = new Map<string, number>();
  nodes.filter((n) => n.col === 0).forEach((n, i) => rowOf.set(n.id, i));
  for (const col of [1, 2]) {
    const taken = new Set<number>();
    for (const n of nodes.filter((x) => x.col === col)) {
      const src = edges.find(([, b]) => b === n.id)?.[0];
      let r = (src !== undefined ? rowOf.get(src) : undefined) ?? 0;
      while (taken.has(r)) r += 1;
      taken.add(r);
      rowOf.set(n.id, r);
    }
  }
  const rows = Math.max(...[...rowOf.values()]) + 1;
  const height = TOP + rows * ROW + 8;
  const pos = new Map<string, { x: number; y: number }>();
  for (const n of nodes) pos.set(n.id, { x: COL_X[n.col], y: TOP + (rowOf.get(n.id) ?? 0) * ROW });

  const lit = useMemo(() => {
    if (!hover) return null;
    const set = new Set([hover]);
    const walk = (from: string, dir: 0 | 1) => {
      for (const edge of edges)
        if (edge[dir] === from && !set.has(edge[1 - dir])) {
          set.add(edge[1 - dir]);
          walk(edge[1 - dir], dir);
        }
    };
    walk(hover, 0);
    walk(hover, 1);
    return set;
  }, [hover, edges]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Legend kits={['skill', 'tool', 'data']} />
        <span className="text-xs text-[var(--ink-faint)]">Hover any box to trace its links</span>
      </div>
      <svg viewBox={`0 0 1000 ${height.toString()}`} className="w-full" role="img" aria-label="Skills, tools and data in this capability, and how they connect">
        {HEADERS.map((h, i) => (
          <text key={h} x={COL_X[i] + NODE_W / 2} y={18} textAnchor="middle" fontSize="12.5" fontWeight="600" fill="#5b5b5b">
            {h}
          </text>
        ))}
        {edges.map(([a, b]) => {
          const p = pos.get(a);
          const q = pos.get(b);
          if (!p || !q) return null;
          const x1 = p.x + NODE_W;
          const y1 = p.y + NODE_H / 2;
          const x2 = q.x;
          const y2 = q.y + NODE_H / 2;
          const bend = (x2 - x1) / 2.4;
          const on = lit ? lit.has(a) && lit.has(b) : false;
          return (
            <path
              key={`${a}-${b}`}
              d={`M${x1.toString()},${y1.toString()} C${(x1 + bend).toString()},${y1.toString()} ${(x2 - bend).toString()},${y2.toString()} ${x2.toString()},${y2.toString()}`}
              fill="none"
              stroke={on ? '#2a2a2a' : '#d9d2cb'}
              strokeWidth={on ? 2 : 1.5}
              opacity={lit && !on ? 0.35 : 1}
            />
          );
        })}
        {nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) return null;
          const dim = lit !== null && !lit.has(n.id);
          return (
            <g key={n.id} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} opacity={dim ? 0.3 : 1}>
              <rect x={p.x - 4} y={p.y - 6} width={NODE_W + 8} height={NODE_H + 12} fill="transparent" />
              <rect x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx={9} fill="#ffffff" stroke="#e2dcd6" />
              <rect x={p.x} y={p.y} width={6} height={NODE_H} rx={3} fill={n.color} />
              <text x={p.x + 16} y={p.y + 19} fontSize="13" fontWeight="600" fill="#2a2a2a">
                {n.label}
              </text>
              <text x={p.x + 16} y={p.y + 34} fontSize="10.5" fill="#8a8a8a">
                {n.sub.length > 44 ? `${n.sub.slice(0, 43)}…` : n.sub}
              </text>
              <title>{`${n.label} · ${n.sub}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

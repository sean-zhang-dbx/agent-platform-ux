import { KIT_COLOR } from './palette';

// Tiny pod shape: orchestrator on top, agents below (Northwind-built with kit dots; Databricks agents with a blue base).
export function PodThumb({ kits, muted = false }: { kits: (keyof typeof KIT_COLOR)[][]; muted?: boolean }) {
  const n = kits.length;
  const w = 200;
  const step = w / n;
  return (
    <svg viewBox={`0 0 ${w.toString()} 70`} className="h-[70px] w-full max-w-[220px]" aria-hidden="true" opacity={muted ? 0.55 : 1}>
      <rect x={w / 2 - 22} y={2} width={44} height={14} rx={4} fill="#2a2a2a" />
      {kits.map((kit, i) => {
        const cx = step * i + step / 2;
        return (
          <g key={`${i.toString()}-${kit.join('')}`}>
            <path d={`M${(w / 2).toString()},16 C${(w / 2).toString()},26 ${cx.toString()},22 ${cx.toString()},32`} stroke="#c9bfb7" strokeWidth="1.2" fill="none" />
            <rect x={cx - 16} y={32} width={32} height={12} rx={3} fill="#3a3632" />
            {kit.length === 1 && kit[0] === 'agent' ? <rect x={cx - 16} y={41} width={32} height={3} rx={1.5} fill={KIT_COLOR.agent} /> : null}
            {kit.filter((k) => k !== 'agent' || kit.length > 1).map((k, j) => (
              <circle key={`${k}-${j.toString()}`} cx={cx - ((kit.length - 1) * 9) / 2 + j * 9} cy={56} r={3.6} fill={KIT_COLOR[k]} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

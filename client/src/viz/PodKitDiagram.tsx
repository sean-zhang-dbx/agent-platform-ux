import { useStore } from '../state/store';
import { builtBy, type RoleAgent } from '../data/estate';
import { gateForAgent } from '../data/pods';
import { sponsorOf } from '../data/access';
import type { Skill } from '../data/types';
import { KIT_COLOR, Legend, kitOf, shortName } from './palette';

const WARN = '#b7791f';

// One kind of agent: every pod member is an agent box. Northwind-built agents carry skills and tools as kit;
// Databricks agents (Genie Agents, Knowledge Assistants) and external agents are ready-made members.

const WIDTH = 996;
const LEFT = 20;
const AGENT_Y = 110;
const AGENT_H = 62;
const KIT_Y = AGENT_Y + AGENT_H + 22;
const KIT_H = 30;
const KIT_GAP = 10;
const SPEC_H = 46;

function fit(text: string, px: number, size: number): string {
  const max = Math.floor(px / (size * 0.56));
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function PodKitDiagram({ agents, platform, onPick }: { agents: RoleAgent[]; platform: Skill[]; onPick: (id: string) => void }) {
  const { state } = useStore();
  const byId = (id: string) => state.skills.find((s) => s.id === id);
  const n = Math.max(1, agents.length);
  const colW = (WIDTH - LEFT * 2) / n;
  const boxW = Math.min(210, colW - 18);
  const kitW = Math.min(190, colW - 34);
  const nameSize = boxW < 180 ? 12 : 13.5;
  const maxKit = Math.max(1, ...agents.map((a) => a.skills.length + a.tools.length));
  const anyCalls = platform.length > 0;
  const pColW = (WIDTH - LEFT * 2) / Math.max(1, platform.length);
  const pBoxW = Math.min(230, pColW - 24);
  const pX = (i: number) => LEFT + pColW * i + pColW / 2;
  const specY = KIT_Y + maxKit * (KIT_H + KIT_GAP) + 44;
  const height = anyCalls ? specY + SPEC_H + 16 : KIT_Y + maxKit * (KIT_H + KIT_GAP) + 12;
  const mid = WIDTH / 2;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Legend kits={['skill', 'tool']} />
        <span className="flex items-center gap-1.5 text-xs text-[var(--ink-soft)]">
          <span className="h-2.5 w-5 rounded-sm bg-[#3a3632]" /> Northwind-built agent
          <span className="ml-2 h-2.5 w-5 rounded-sm border-b-[3px] border-[#2a78d6] bg-[#3a3632]" /> Databricks agent
          <span className="ml-2 h-2.5 w-5 rounded-sm border-b-[3px] border-[#b7791f] bg-[#3a3632]" /> needs a department sign-off
        </span>
        <span className="text-xs text-[var(--ink-faint)]">Every member is an agent · click one for details</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH.toString()} ${height.toString()}`} className="w-full" role="img" aria-label="Pod: orchestrator and its agents. Northwind-built agents show their skills and tools; Databricks agents are ready-made members">
        <rect x={mid - 150} y={14} width={300} height={52} rx={12} fill="#2a2a2a" />
        <text x={mid} y={38} textAnchor="middle" fill="#fff" fontSize="15" fontWeight="600">
          Orchestrator
        </text>
        <text x={mid} y={55} textAnchor="middle" fill="#bdb6b0" fontSize="11.5">
          splits the work · assembles the result
        </text>
        {anyCalls && (
          <text x={WIDTH - LEFT} y={specY - 12} textAnchor="end" fontSize="11" fontWeight="600" fill="#8a8a8a">
            DATABRICKS AGENTS IN THIS POD
          </text>
        )}
        {platform.map((s, i) => {
          const cx = pX(i);
          const ext = builtBy(s) === 'External';
          return (
            <g key={s.id} onClick={() => onPick(s.id)} className="cursor-pointer">
              {agents
                .filter((a) => a.calls.includes(s.id))
                .map((a) => {
                  const ax = LEFT + colW * agents.indexOf(a) + colW / 2 + boxW / 2 - 6;
                  return <path key={a.id} d={`M${ax.toString()},${(AGENT_Y + AGENT_H).toString()} C${ax.toString()},${(specY - 30).toString()} ${cx.toString()},${(specY - 30).toString()} ${cx.toString()},${specY.toString()}`} fill="none" stroke={KIT_COLOR.agent} strokeWidth="1.2" opacity={0.55} />;
                })}
              <rect x={cx - pBoxW / 2} y={specY} width={pBoxW} height={SPEC_H} rx={10} fill="#3a3632" />
              <rect x={cx - pBoxW / 2} y={specY + SPEC_H - 5} width={pBoxW} height={5} rx={2.5} fill={KIT_COLOR.agent} />
              <text x={cx} y={specY + 19} textAnchor="middle" fill="#fff" fontSize="12.5" fontWeight="600">
                {fit(shortName(s.name), pBoxW - 12, 12.5)}
              </text>
              <text x={cx} y={specY + 34} textAnchor="middle" fill="#bdb6b0" fontSize="10.5">
                {ext ? `External · ${s.runsOn ?? ''}` : `Databricks · ${s.type}`}
              </text>
              <title>{`${s.name} · ${ext ? 'External agent' : `Databricks ${s.type}`} · pod member`}</title>
            </g>
          );
        })}

        {agents.map((a, i) => {
          const cx = LEFT + colW * i + colW / 2;
          const kit = [...a.skills, ...a.tools].map(byId).filter((s) => s !== undefined);
          const gate = gateForAgent(a.podId, a.id);
          const dept = gate?.department ?? sponsorOf(a);
          return (
            <g key={a.id}>
              <path d={`M${mid.toString()},66 C${mid.toString()},92 ${cx.toString()},84 ${cx.toString()},${AGENT_Y.toString()}`} stroke="#c9bfb7" strokeWidth="1.5" fill="none" />
              <g onClick={() => onPick(a.id)} className="cursor-pointer">
                <rect x={cx - boxW / 2} y={AGENT_Y} width={boxW} height={AGENT_H} rx={10} fill="#3a3632" />
                {gate && <rect x={cx - boxW / 2} y={AGENT_Y + AGENT_H - 5} width={boxW} height={5} rx={2.5} fill={WARN} />}
                <text x={cx} y={AGENT_Y + 16} textAnchor="middle" fill="#fff" fontSize={nameSize} fontWeight="600">
                  {fit(a.name, boxW - 12, nameSize)}
                </text>
                <text x={cx} y={AGENT_Y + 30} textAnchor="middle" fill="#bdb6b0" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                  {a.servicePrincipal}
                </text>
                <text x={cx} y={AGENT_Y + 47} textAnchor="middle" fill={gate ? '#f0c775' : '#9c948c'} fontSize="10">
                  {fit(`${gate ? '⚑ sign-off · ' : 'acts for · '}${dept}`, boxW - 16, 10)}
                </text>
                <title>{gate ? `${a.name} · acts for ${dept} · sign-off: ${gate.approverRole}` : `${a.name} · acts for ${dept}`}</title>
              </g>
              {kit.length > 0 && <line x1={cx} y1={AGENT_Y + AGENT_H} x2={cx} y2={KIT_Y + (kit.length - 1) * (KIT_H + KIT_GAP) + KIT_H / 2} stroke="#d9d2cb" strokeWidth="1.5" />}
              {kit.map((s, k) => {
                const y = KIT_Y + k * (KIT_H + KIT_GAP);
                return (
                  <g key={s.id}>
                    <rect x={cx - kitW / 2} y={y} width={kitW} height={KIT_H} rx={8} fill="#fff" stroke="#e2dcd6" />
                    <rect x={cx - kitW / 2} y={y} width={6} height={KIT_H} rx={3} fill={KIT_COLOR[kitOf(s)]} />
                    <text x={cx - kitW / 2 + 14} y={y + KIT_H / 2 + 4} fontSize="11.5" fill="#2a2a2a">
                      {fit(shortName(s.name), kitW - 20, 11.5)}
                    </text>
                    <title>{`${s.type}: ${s.name}`}</title>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

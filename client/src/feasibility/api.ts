import { useCallback, useEffect, useState } from 'react';
import type { Decision, RunDetail, WsKey } from '../../../shared/feasibility';
import { SESSION_USER, contactSite, createRun, decide, listRuns, release, rerun, runDetail, startTicker } from './mock/engine';
import { tamper, verifyChain } from './mock/store';

// Front-end-only build: the "API" is an in-browser engine (./mock) with the same contract the
// server version exposed. Calls resolve asynchronously so the UI behaves exactly as it did.
function call<T>(fn: () => T): Promise<T> {
  startTicker();
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(fn());
      } catch (e) {
        reject(e instanceof Error ? new Error(e.message) : new Error(String(e)));
      }
    }, 0);
  });
}

export const api = {
  runs: () => call(listRuns),
  create: (preset: string) => call(() => ({ run_id: createRun(preset, SESSION_USER) })),
  run: (id: string) =>
    call(() => {
      const d = runDetail(id);
      if (!d) throw new Error('Run not found');
      return d;
    }),
  decide: (id: string, ws: WsKey, body: { decision: Decision; signature: string; comment: string; confirm: boolean }) => call(() => decide(id, ws, body, SESSION_USER)),
  rerun: (id: string, ws: WsKey) =>
    call(() => {
      rerun(id, ws, SESSION_USER);
      return { ok: true };
    }),
  release: (id: string, body: { signature: string; comment: string; confirm: boolean }) => call(() => release(id, body, SESSION_USER)),
  verify: () => call(verifyChain),
  tamper: (seq: number) => call(() => tamper(seq)),
  contact: (runId: string, siteId: string) =>
    call(() => {
      contactSite(runId, siteId, SESSION_USER);
      return { ok: true };
    }),
};

// Polls the run while anything can still change; stops once the record is locked.
export function useRun(runId: string | undefined) {
  const [data, setData] = useState<RunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!runId) return;
    try {
      setData(await api.run(runId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [runId]);
  const locked = data?.run.locked ?? false;
  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    const t = locked ? undefined : setInterval(() => void refresh(), 1200);
    return () => {
      clearTimeout(first);
      if (t) clearInterval(t);
    };
  }, [refresh, locked]);
  return { data, error, refresh };
}

export const shortHash = (h: string | null | undefined, n = 10) => (h ? `${h.slice(0, n)}…` : '—');
export const when = (iso: string | null | undefined) => (iso ? new Date(iso).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : '—');

// In-browser stand-in for the systems of record and workflow tables. State lives in memory and is
// mirrored to localStorage so a run survives a reload. Nothing here talks to a server.
import type { AuditRow, EventRow, RunRow, SourceUse, WsKey, WsState } from '../../../../shared/feasibility';
import { CTMS_TRIALS, LIBRARY, SAFETY_FINDINGS, SITES, type LibrarySeed, type SafetySeed, type SiteSeed, type TrialSeed } from './seed';
import { canonical, sha256 } from './sha256';

export const S = 'trial_feasibility';
export { canonical, sha256 };

export type Trial = TrialSeed;
export type Site = SiteSeed;
export type Finding = SafetySeed;
export type LibraryDoc = LibrarySeed;

export interface Step {
  ms: number;
  kind: EventRow['kind'];
  text: string;
}

export interface WsRecord {
  run_id: string;
  ws_key: WsKey;
  state: WsState;
  attempt: number;
  step: number;
  next_at: number | null; // epoch ms
  output: Record<string, unknown> | null;
  output_hash: string | null;
  artifact_ref: string | null;
  sources: SourceUse[];
  feedback: string | null;
  steps: Step[] | null;
  updated_at: string;
}

export interface DocVersion {
  doc_id: string;
  version: number;
  content: string;
  sha256: string;
  author: string;
  change_note: string;
  created_at: string;
}

interface Data {
  runs: RunRow[];
  workstreams: WsRecord[];
  events: (EventRow & { run_id: string })[];
  audit: AuditRow[];
  documents: { doc_id: string; title: string; run_id: string; current_version: number; status: string }[];
  versions: DocVersion[];
  contacts: { run_id: string; site_id: string; contacted_by: string; contacted_at: string }[];
  nextEvent: number;
}

const KEY = 'trial-feasibility-store-v1';
const empty = (): Data => ({ runs: [], workstreams: [], events: [], audit: [], documents: [], versions: [], contacts: [], nextEvent: 1 });

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...empty(), ...(JSON.parse(raw) as Partial<Data>) };
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  return empty();
}

export const db: Data = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* storage blocked: keep going in memory */
  }
}

export const nowIso = () => new Date().toISOString();

export function event(runId: string, ws: string | null, kind: EventRow['kind'], text: string) {
  db.events.push({ id: db.nextEvent++, run_id: runId, ws_key: ws, at: nowIso(), kind, text });
}

// ── Mock systems of record (same shape as the API they stand in for) ──────────
export const ctms = {
  trials: (indication: string): Trial[] => CTMS_TRIALS.filter((t) => t.indication === indication),
};

export const siteDb = {
  sites: (area: string): Site[] => SITES.filter((s) => s.therapeutic_areas.includes(area)),
  openFindings: (): Finding[] => SAFETY_FINDINGS.filter((f) => f.status === 'Open'),
};

export const library = {
  get: (ids: string[]): LibraryDoc[] => LIBRARY.filter((l) => ids.includes(l.doc_id)),
};

export const docRepo = {
  // Writes a new immutable version and moves the document's head to it.
  commit(doc: { doc_id: string; title: string; run_id: string }, content: string, author: string, note: string): DocVersion {
    const head = db.documents.find((d) => d.doc_id === doc.doc_id);
    const version = (head?.current_version ?? 0) + 1;
    const v: DocVersion = Object.freeze({ doc_id: doc.doc_id, version, content, sha256: sha256(content), author, change_note: note, created_at: nowIso() });
    db.versions.push(v);
    if (head) {
      head.current_version = version;
      head.status = 'Draft';
    } else db.documents.push({ ...doc, current_version: version, status: 'Draft' });
    return v;
  },
  setStatus(docId: string, status: string) {
    const d = db.documents.find((x) => x.doc_id === docId);
    if (d) d.status = status;
  },
};

// ── Append-only, hash-chained audit log ───────────────────────────────────────
export type AuditInput = Omit<AuditRow, 'seq' | 'signed_at' | 'prev_hash' | 'record_hash'>;
export const GENESIS = '0'.repeat(64);

export function recordHash(prev: string, r: AuditInput & { signed_at: string }): string {
  return sha256(
    prev +
      canonical({
        run_id: r.run_id, ws_key: r.ws_key, record_type: r.record_type, reviewer: r.reviewer, role: r.role, decision: r.decision,
        signature_meaning: r.signature_meaning, signature_name: r.signature_name, comment: r.comment, authenticated_as: r.authenticated_as,
        signed_at: r.signed_at, artifact_ref: r.artifact_ref, artifact_hash: r.artifact_hash, attempt: r.attempt,
      }),
  );
}

export function appendAudit(r: AuditInput): AuditRow {
  const prev = db.audit.at(-1)?.record_hash ?? GENESIS;
  const signed_at = nowIso();
  const row: AuditRow = Object.freeze({ ...r, seq: db.audit.length + 1, signed_at, prev_hash: prev, record_hash: recordHash(prev, { ...r, signed_at }) });
  db.audit.push(row);
  return row;
}

// Recompute every hash in the chain. Returns the first broken seq, if any.
export function verifyChain(): { ok: boolean; checked: number; brokenAt?: number } {
  let prev = GENESIS;
  for (const r of db.audit) {
    if (r.prev_hash !== prev || r.record_hash !== recordHash(prev, r)) return { ok: false, checked: db.audit.length, brokenAt: r.seq };
    prev = r.record_hash;
  }
  return { ok: true, checked: db.audit.length };
}

// Proves the log is append-only: the store refuses any edit to a signed record.
export function tamper(seq: number): { blocked: boolean; message: string } {
  const row = db.audit.find((a) => a.seq === seq);
  if (!row) return { blocked: true, message: `audit_log record ${seq.toString()} does not exist` };
  try {
    (row as { comment: string }).comment += ' (edited)';
    return { blocked: false, message: 'Update succeeded (unexpected)' };
  } catch {
    return { blocked: true, message: 'audit_log is append-only: UPDATE is not allowed' };
  }
}

// Records restored from localStorage lose Object.freeze; re-freeze them on load.
for (const a of db.audit) Object.freeze(a);
for (const v of db.versions) Object.freeze(v);

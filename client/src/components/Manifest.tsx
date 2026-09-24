import { useState, type ReactNode } from 'react';
import { Check, CircleAlert, Copy, FileCode2, GitBranch } from 'lucide-react';
import { LIFECYCLE, type ManifestBundle } from '../data/manifest';
import { cx } from '../lib/format';

const C = { key: '#f3a36b', punct: '#8d827a', value: '#ece4dc', version: '#8fd6b0', comment: '#8a7f77', string: '#f0d58c', num: '#86bdf7' };

function value(v: string): ReactNode {
  const t = v.trim();
  if (!t) return v;
  if (/^".*"$/.test(t)) return <span style={{ color: C.string }}>{v}</span>;
  if (/^[\d.]+$/.test(t) || t === 'true' || t === 'false') return <span style={{ color: C.num }}>{v}</span>;
  const at = v.lastIndexOf('@');
  if (at > 0 && /^@[\w.]+$/.test(v.slice(at).trim()))
    return (
      <>
        <span style={{ color: C.value }}>{v.slice(0, at)}</span>
        <span style={{ color: C.version }}>{v.slice(at)}</span>
      </>
    );
  return <span style={{ color: C.value }}>{v}</span>;
}

function highlight(line: string): ReactNode {
  if (/^\s*(#|<!--)/.test(line)) return <span style={{ color: C.comment }}>{line}</span>;
  if (line.trim() === '---') return <span style={{ color: C.punct }}>{line}</span>;
  const ci = line.search(/\s#\s/);
  const code = ci >= 0 ? line.slice(0, ci) : line;
  const comment = ci >= 0 ? line.slice(ci) : '';
  const m = /^(\s*)(-\s+)?([A-Za-z_][\w-]*)(:)(.*)$/.exec(code);
  let body: ReactNode;
  if (m) {
    body = (
      <>
        {m[1]}
        {m[2] && <span style={{ color: C.punct }}>{m[2]}</span>}
        <span style={{ color: C.key }}>{m[3]}</span>
        <span style={{ color: C.punct }}>{m[4]}</span>
        {value(m[5])}
      </>
    );
  } else {
    const d = /^(\s*)(-\s+)(.*)$/.exec(code);
    body = d ? (
      <>
        {d[1]}
        <span style={{ color: C.punct }}>{d[2]}</span>
        {value(d[3])}
      </>
    ) : (
      <span style={{ color: C.value }}>{code}</span>
    );
  }
  return (
    <>
      {body}
      {comment && <span style={{ color: C.comment }}>{comment}</span>}
    </>
  );
}

export function YamlView({ text, className }: { text: string; className?: string }) {
  return (
    <pre className={cx('overflow-auto bg-[#1f1d1b] py-3 font-mono text-[12px] leading-5 [font-variant-ligatures:none]', className)}>
      {text.split('\n').map((l, i) => (
        <div key={i} className="flex pr-4">
          <span className="w-9 shrink-0 select-none pr-3 text-right text-[#5f5650]">{i + 1}</span>
          <span className="whitespace-pre">{highlight(l)}</span>
        </div>
      ))}
    </pre>
  );
}

function Lifecycle({ stage }: { stage: number }) {
  return (
    <ol className="space-y-1">
      {LIFECYCLE.map((s, i) => (
        <li key={s} className={cx('flex items-center gap-2 text-sm', i > stage && 'text-[var(--ink-faint)]')}>
          <span
            className={cx(
              'grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[9px] font-semibold',
              i < stage || (i === stage && stage === LIFECYCLE.length - 1) ? 'border-[var(--ok)] bg-[var(--ok)] text-white' : i === stage ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-strong)]' : 'border-[#d9d1ca]',
            )}
          >
            {i < stage || (i === stage && stage === LIFECYCLE.length - 1) ? <Check className="h-2.5 w-2.5" /> : null}
          </span>
          <span className={cx(i === stage && 'font-semibold')}>{s}</span>
          {i === stage && stage < LIFECYCLE.length - 1 && <span className="text-xs text-[var(--brand-strong)]">now</span>}
        </li>
      ))}
    </ol>
  );
}

export function ManifestPanel({ bundle, stacked = false }: { bundle: ManifestBundle; stacked?: boolean }) {
  const [file, setFile] = useState(0);
  const [copied, setCopied] = useState(false);
  const f = bundle.files[Math.min(file, bundle.files.length - 1)];
  const copy = () => {
    try {
      void navigator.clipboard.writeText(f.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked; nothing to do */
    }
  };

  return (
    <div className={cx('grid gap-4', !stacked && 'lg:grid-cols-[minmax(0,1fr)_15rem]')}>
      <div className="min-w-0 self-start overflow-hidden rounded-xl border border-[#2e2a27]">
        <div className="flex flex-wrap items-center gap-2 bg-[#2a2623] px-3 py-2 text-xs text-[#cbbfb6]">
          <GitBranch className="h-3.5 w-3.5 text-[var(--brand)]" />
          <span className="min-w-0 flex-1 truncate font-mono">{bundle.path}</span>
          {bundle.files.length > 1 &&
            bundle.files.map((x, i) => (
              <button key={x.name} type="button" onClick={() => setFile(i)} className={cx('rounded px-2 py-0.5 font-mono', i === file ? 'bg-[#1f1d1b] text-white' : 'hover:text-white')}>
                {x.name}
              </button>
            ))}
          <button type="button" onClick={copy} className="flex items-center gap-1 rounded px-2 py-0.5 hover:text-white" aria-label="Copy manifest">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <YamlView text={f.text} className="max-h-[520px]" />
      </div>

      <div className={cx('space-y-4', stacked && 'grid gap-4 space-y-0 sm:grid-cols-2')}>
        <div className="rounded-xl border border-[var(--line)] bg-white p-4">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <FileCode2 className="h-4 w-4 text-[var(--brand)]" /> The loader creates
          </div>
          <ul className="space-y-2">
            {bundle.generated.map((g) => (
              <li key={g.label} className="text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{g.label}</span>
                  <span className="text-right text-[11px] text-[var(--ink-faint)]">{g.system}</span>
                </div>
                <div className="break-words text-xs text-[var(--ink-soft)] [overflow-wrap:anywhere]">{g.value}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-white p-4">
          <div className="mb-2 text-sm font-semibold">Pipeline</div>
          <Lifecycle stage={bundle.stage} />
          <ul className="mt-3 space-y-1 border-t border-[var(--line)] pt-3 text-xs">
            {bundle.lint.map((l) => (
              <li key={l.text} className={cx('flex items-center gap-1.5', l.ok ? 'text-[var(--ink-soft)]' : 'text-[var(--warn)]')}>
                {l.ok ? <Check className="h-3.5 w-3.5 text-[var(--ok)]" /> : <CircleAlert className="h-3.5 w-3.5" />}
                {l.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

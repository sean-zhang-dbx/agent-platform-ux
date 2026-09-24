import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cx } from '../lib/format';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sort?: (row: T) => number | string;
  align?: 'left' | 'right' | 'center';
  width?: string;
  hideBelow?: 'md' | 'lg';
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRow,
  search,
  placeholder = 'Search',
  pageSize = 15,
  toolbar,
  empty = 'Nothing matches.',
  initialSort,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRow?: (row: T) => void;
  search?: (row: T) => string;
  placeholder?: string;
  pageSize?: number;
  toolbar?: ReactNode;
  empty?: string;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = q && search ? rows.filter((r) => search(r).toLowerCase().includes(q)) : rows;
    const col = sort ? columns.find((c) => c.key === sort.key) : undefined;
    if (sort && col?.sort) {
      const f = col.sort;
      out = [...out].sort((a, b) => {
        const x = f(a);
        const y = f(b);
        const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return out;
  }, [rows, query, sort, columns, search]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * pageSize, current * pageSize + pageSize);
  const hide = (c: Column<T>) => (c.hideBelow === 'md' ? 'hidden md:table-cell' : c.hideBelow === 'lg' ? 'hidden lg:table-cell' : '');
  const align = (c: Column<T>) => (c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left');

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {search && (
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2">
            <Search className="h-4 w-4 text-[var(--ink-faint)]" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder={placeholder}
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--ink-faint)]"
            />
          </label>
        )}
        {toolbar}
        <span className="ml-auto text-xs tabular-nums text-[var(--ink-faint)]">{filtered.length.toLocaleString()} results</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[var(--canvas)] text-xs text-[var(--ink-faint)]">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={cx('px-4 py-2.5 font-medium', align(c), hide(c))} style={c.width ? { width: c.width } : undefined}>
                  {c.sort ? (
                    <button
                      type="button"
                      onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'desc' }))}
                      className={cx('inline-flex items-center gap-1 hover:text-[var(--ink)]', sort?.key === c.key && 'text-[var(--ink)]')}
                    >
                      {c.header}
                      {sort?.key === c.key && (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-[var(--ink-soft)]">
                  {empty}
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <tr key={rowKey(r)} onClick={onRow ? () => onRow(r) : undefined} className={cx('border-t border-[var(--line)]', onRow && 'cursor-pointer hover:bg-[var(--brand-soft)]/50')}>
                {columns.map((c) => (
                  <td key={c.key} className={cx('px-4 py-2.5', align(c), hide(c))}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-[var(--ink-soft)]">
          <span className="tabular-nums">
            Page {current + 1} of {pages}
          </span>
          <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="rounded-md border border-[var(--line)] bg-white p-1 disabled:opacity-40" aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="rounded-md border border-[var(--line)] bg-white p-1 disabled:opacity-40" aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function FilterSelect({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: [string, string][]; label: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm">
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

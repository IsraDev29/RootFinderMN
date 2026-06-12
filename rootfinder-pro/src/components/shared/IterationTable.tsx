import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type IterationRow = Record<string, unknown> & { iteration?: number };

interface IterationTableProps<TRow extends IterationRow> {
  rows: TRow[];
  title?: string;
  collapseAfter?: number;
  maxVisibleRows?: number;
  className?: string;
}

const ROW_HEIGHT = 42;
const HEADER_HEIGHT = 48;
const MAX_TABLE_HEIGHT = 520;

function formatCellValue(value: unknown): string {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(6);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => formatCellValue(item)).join(', ')}]`;
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value ?? '');
}

/**
 * Tabla de iteraciones con colapso inicial y virtualización ligera para listas largas.
 */
export function IterationTable<TRow extends IterationRow>({
  rows,
  title = 'Iteraciones',
  collapseAfter = 20,
  maxVisibleRows = 12,
  className,
}: IterationTableProps<TRow>) {
  const [expanded, setExpanded] = useState(rows.length <= collapseAfter);
  const [scrollTop, setScrollTop] = useState(0);

  const columns = useMemo(() => {
    if (rows.length === 0) {
      return [] as string[];
    }

    return Object.keys(rows[0]);
  }, [rows]);

  const visibleRows = expanded ? rows : rows.slice(0, collapseAfter);
  const virtualized = visibleRows.length > 50;
  const viewportHeight = Math.min(visibleRows.length, maxVisibleRows) * ROW_HEIGHT + HEADER_HEIGHT;
  const totalHeight = visibleRows.length * ROW_HEIGHT;
  const startIndex = virtualized ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 4) : 0;
  const endIndex = virtualized
    ? Math.min(visibleRows.length, Math.ceil((scrollTop + MAX_TABLE_HEIGHT) / ROW_HEIGHT) + 4)
    : visibleRows.length;
  const renderedRows = visibleRows.slice(startIndex, endIndex);

  if (rows.length === 0) {
    return (
      <div
        className={cn(
          'rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-muted)]',
          className,
        )}
      >
        No hay iteraciones disponibles.
      </div>
    );
  }

  return (
    <section className={cn('rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl shadow-black/10', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="text-xs text-[var(--text-muted)]">{rows.length} filas generadas</p>
        </div>
        {rows.length > collapseAfter ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((current) => !current)}
            className="h-8 rounded-full px-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? 'Colapsar' : 'Expandir'}
          </Button>
        ) : null}
      </div>

      <div
        className="overflow-auto"
        style={{ maxHeight: Math.min(viewportHeight, MAX_TABLE_HEIGHT) }}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <table className="w-full table-fixed border-collapse text-[var(--text-primary)]">
          <thead className="sticky top-0 z-10 bg-[linear-gradient(180deg,rgba(16,185,129,0.96),rgba(5,150,105,0.96))]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="border-b border-emerald-900/40 bg-transparent px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-50"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {virtualized && startIndex > 0 ? (
              <tr style={{ height: startIndex * ROW_HEIGHT }}>
                <td colSpan={columns.length} />
              </tr>
            ) : null}

            {renderedRows.map((row, rowIndex) => {
              const absoluteIndex = startIndex + rowIndex;
              const isLast = absoluteIndex === visibleRows.length - 1;

              return (
                <tr
                  key={absoluteIndex}
                  className={cn(
                    'border-b border-[var(--border)] align-top',
                    absoluteIndex % 2 === 0 ? 'bg-[var(--bg-elevated)]/70' : 'bg-[var(--bg-surface)]',
                    isLast && 'bg-[color:rgba(16,185,129,0.10)]',
                  )}
                  style={{ height: ROW_HEIGHT }}
                >
                  {columns.map((column) => (
                    <td
                      key={`${absoluteIndex}-${column}`}
                      className="px-3 py-2 text-center font-mono text-xs text-[var(--text-primary)]"
                    >
                      {formatCellValue(row[column])}
                    </td>
                  ))}
                </tr>
              );
            })}

            {virtualized && endIndex < visibleRows.length ? (
              <tr style={{ height: (visibleRows.length - endIndex) * ROW_HEIGHT }}>
                <td colSpan={columns.length} />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

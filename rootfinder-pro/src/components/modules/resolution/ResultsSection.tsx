import { Card, CardContent } from '@/components/ui/card';
import { ConvergenceChart } from '@/components/shared/ConvergenceChart';
import { GeoGebraGraph } from '@/components/GeoGebraGraph';
import { IterationTable } from '@/components/shared/IterationTable';
import { MethodBadge } from '@/components/shared/MethodBadge';
import { estimateFunctionViewport, normalizeRange } from '@/lib/graphUtils';
import type { CalculationResult } from '@/types';

interface ResultsSectionProps {
  result: CalculationResult | null;
  onBackToMethods: () => void;
}

/**
 * Resume el resultado principal y presenta iteraciones con componentes compartidos.
 */
export function ResultsSection({ result, onBackToMethods }: ResultsSectionProps) {
  if (!result) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-sm text-[var(--text-muted)]">
        No hay un resultado activo todavía.
      </div>
    );
  }

  const fallbackRange = {
    xmin: -10,
    xmax: 10,
    ymin: -10,
    ymax: 10,
  };
  const autoRange = estimateFunctionViewport(result.functionF, { root: result.root, fallback: fallbackRange });
  const effectiveRange = normalizeRange(autoRange, fallbackRange);

  return (
    <div className="space-y-6">
      <Card className="border-[var(--border)] bg-[linear-gradient(180deg,rgba(6,182,212,0.08),rgba(15,21,18,0.96))]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex items-center gap-3">
              <MethodBadge method={result.method} />
              <span className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                {result.converged ? 'Convergencia alcanzada' : 'Sin convergencia'}
              </span>
            </div>
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Raíz aproximada
            </p>
            <h2 className="mt-2 font-mono text-4xl font-extrabold text-[var(--text-primary)]">
              {result.root !== null ? result.root.toFixed(10) : 'N/D'}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">{result.message}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onBackToMethods}
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)]"
              >
                Ajustar entrada
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Error</p>
              <p className="mt-3 font-mono text-sm text-[var(--text-primary)]">
                {result.error !== null ? result.error.toExponential(4) : 'N/D'}
              </p>
            </div>
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Iteraciones</p>
              <p className="mt-3 font-mono text-sm text-[var(--text-primary)]">{result.iterations.length}</p>
            </div>
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Función</p>
              <p className="mt-3 line-clamp-3 font-mono text-xs text-[var(--text-primary)]">
                {result.functionF}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-[var(--border)] bg-[var(--bg-surface)]">
        <CardContent className="p-0">
          <div className="border-b border-[var(--border)] px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              GeoGebra
            </p>
            <h3 className="mt-2 text-2xl font-extrabold text-[var(--text-primary)]">
              Gráfica de validación
            </h3>
            <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
              Esta vista usa GeoGebra directamente para contrastar la función con la raíz calculada.
            </p>
          </div>
          <div className="p-4">
            <GeoGebraGraph
              expressions={[result.functionF]}
              points={result.root !== null ? [{ x: result.root, y: 0, label: 'Raíz' }] : []}
              xMin={effectiveRange.xmin}
              xMax={effectiveRange.xmax}
              yMin={effectiveRange.ymin}
              yMax={effectiveRange.ymax}
              heightClassName="h-[30rem] lg:h-[36rem]"
            />
          </div>
        </CardContent>
      </Card>

      <ConvergenceChart iterations={result.iterations} />
      <IterationTable rows={result.iterations} title="Tabla de iteraciones" />
    </div>
  );
}

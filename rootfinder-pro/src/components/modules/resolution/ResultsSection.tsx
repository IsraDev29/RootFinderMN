import { Card, CardContent } from '@/components/ui/card';
import { ConvergenceChart } from '@/components/shared/ConvergenceChart';
import { MathGraph } from '@/components/shared/MathGraph';
import { IterationTable } from '@/components/shared/IterationTable';
import { MethodBadge } from '@/components/shared/MethodBadge';
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

  const isDerivativeMethod = result.method === 'richardson';
  const isIntegralMethod = result.method === 'romberg';
  const valueLabel = isDerivativeMethod
    ? 'Derivada aproximada'
    : isIntegralMethod
    ? 'Integral aproximada'
    : 'Raíz aproximada';
  const graphPoints = !isDerivativeMethod && !isIntegralMethod && result.root !== null
    ? [{ x: result.root, y: 0, label: 'Raíz' }]
    : [];

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
              {valueLabel}
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

      <MathGraph
        title="Gráfica de validación"
        expressions={[result.functionF]}
        points={graphPoints}
      />

      <ConvergenceChart iterations={result.iterations} />
      <IterationTable rows={result.iterations} title="Tabla de iteraciones" />
    </div>
  );
}

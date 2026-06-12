import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ConvergenceChartProps {
  iterations: Array<{
    iteration: number;
    ea?: number;
  }>;
  className?: string;
}

function readErrorValue(iteration: ConvergenceChartProps['iterations'][number]): number | null {
  const directError = iteration.ea;
  if (typeof directError === 'number' && Number.isFinite(directError)) {
    return Math.max(directError, Number.EPSILON);
  }

  return null;
}

/**
 * Dibuja una curva simple de convergencia usando SVG sin dependencias externas.
 */
export function ConvergenceChart({ iterations, className }: ConvergenceChartProps) {
  const chart = useMemo(() => {
    const values = iterations
      .map((iteration, index) => {
        const error = readErrorValue(iteration);
        if (error === null) {
          return null;
        }

        return {
          x: typeof iteration.iteration === 'number' && Number.isFinite(iteration.iteration)
            ? iteration.iteration
            : index + 1,
          y: error,
        };
      })
      .filter((value): value is { x: number; y: number } => value !== null);

    if (values.length < 2) {
      return null;
    }

    const width = 760;
    const height = 240;
    const padding = { top: 18, right: 18, bottom: 30, left: 54 };
    const maxValue = Math.max(...values.map((item) => item.y));
    const minValue = Math.min(...values.map((item) => item.y));
    const minIteration = Math.min(...values.map((item) => item.x));
    const maxIteration = Math.max(...values.map((item) => item.x));
    const span = Math.max(maxValue - minValue, Number.EPSILON * 10);
    const xSpan = Math.max(maxIteration - minIteration, 1);
    const paddedMin = Math.max(minValue - span * 0.15, Number.EPSILON);
    const paddedMax = maxValue + span * 0.2;

    const projectX = (value: number) =>
      padding.left + ((value - minIteration) / xSpan) * (width - padding.left - padding.right);
    const projectY = (value: number) =>
      height - padding.bottom - ((value - paddedMin) / (paddedMax - paddedMin || 1)) * (height - padding.top - padding.bottom);

    const points = values.map((value) => ({
      ...value,
      px: projectX(value.x),
      py: projectY(value.y),
    }));

    const path = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.px.toFixed(2)} ${point.py.toFixed(2)}`)
      .join(' ');

    const gridLines = Array.from({ length: 5 }, (_, index) => {
      const ratio = index / 4;
      const value = paddedMax - (paddedMax - paddedMin) * ratio;
      return {
        y: projectY(value),
        label: value.toExponential(2),
      };
    });

    return {
      latest: values[values.length - 1]?.y ?? 0,
      best: minValue,
      points,
      path,
      width,
      height,
      padding,
      gridLines,
      firstIteration: minIteration,
      lastIteration: maxIteration,
    };
  }, [iterations]);

  if (!chart) {
    return (
      <div
        className={cn(
          'flex h-36 items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm text-[var(--text-muted)]',
          className,
        )}
      >
        Se necesitan al menos dos iteraciones para graficar convergencia.
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] p-4',
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Convergencia
          </p>
          <p className="text-sm text-[var(--text-primary)]">Error absoluto por iteración</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Último</p>
          <p className="font-mono text-sm text-[var(--text-primary)]">{chart.latest.toExponential(3)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(12,18,15,0.98),rgba(5,8,7,0.98))]">
        <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="block h-56 w-full">
          {chart.gridLines.map((line) => (
            <g key={line.label}>
              <line
                x1={chart.padding.left}
                x2={chart.width - chart.padding.right}
                y1={line.y}
                y2={line.y}
                stroke="rgba(148, 163, 184, 0.18)"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
              <text
                x={chart.padding.left - 10}
                y={line.y + 4}
                textAnchor="end"
                fill="rgba(226, 232, 240, 0.72)"
                fontSize="11"
                fontFamily="monospace"
              >
                {line.label}
              </text>
            </g>
          ))}

          <line
            x1={chart.padding.left}
            x2={chart.width - chart.padding.right}
            y1={chart.height - chart.padding.bottom}
            y2={chart.height - chart.padding.bottom}
            stroke="rgba(226, 232, 240, 0.22)"
            strokeWidth="1.2"
          />
          <path
            d={chart.path}
            fill="none"
            stroke="rgb(34, 211, 238)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {chart.points.map((point, index) => (
            <circle
              key={`${point.x}-${point.y}-${index}`}
              cx={point.px}
              cy={point.py}
              r={index === chart.points.length - 1 ? 5.5 : 4}
              fill={index === chart.points.length - 1 ? 'rgb(125, 211, 252)' : 'rgb(34, 211, 238)'}
            />
          ))}
          <text
            x={chart.padding.left}
            y={chart.height - 8}
            fill="rgba(226, 232, 240, 0.72)"
            fontSize="11"
            fontFamily="monospace"
          >
            i = {chart.firstIteration}
          </text>
          <text
            x={chart.width - chart.padding.right}
            y={chart.height - 8}
            textAnchor="end"
            fill="rgba(226, 232, 240, 0.72)"
            fontSize="11"
            fontFamily="monospace"
          >
            i = {chart.lastIteration}
          </text>
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
        <span>Iteración {chart.firstIteration}</span>
        <span className="font-mono">mejor: {chart.best.toExponential(3)}</span>
        <span>Iteración {chart.lastIteration}</span>
      </div>
    </div>
  );
}

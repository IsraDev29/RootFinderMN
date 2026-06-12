import { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Grid3x3,
  Layers3,
  Sparkles,
  Table2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConvergenceChart } from '@/components/shared/ConvergenceChart';
import {
  AdvancedMethods,
  type IterativeLinearMethod,
  type LinearSystemResult,
  type NewtonInterpolationResult,
  type NewtonNode,
} from '@/lib/advancedMethods';
import { cn } from '@/lib/utils';

const MIN_DIMENSION = 2;
const MAX_DIMENSION = 6;
const MIN_POINTS = 2;
const MAX_POINTS = 8;

const linearExamples = [
  {
    label: 'Sistema 3x3',
    method: 'jacobi' as const,
    dimension: 3,
    matrix: [
      ['10', '1', '1'],
      ['2', '10', '1'],
      ['2', '2', '10'],
    ],
    constants: ['12', '13', '14'],
    initials: ['0', '0', '0'],
  },
  {
    label: 'Seidel 3x3',
    method: 'gauss-seidel' as const,
    dimension: 3,
    matrix: [
      ['4', '1', '1'],
      ['2', '7', '1'],
      ['1', '-1', '5'],
    ],
    constants: ['7', '18', '7'],
    initials: ['0', '0', '0'],
  },
];

const interpolationExample = {
  points: [
    ['0', '1'],
    ['1', '2'],
    ['2', '5'],
    ['3', '10'],
  ],
  evaluatedPoint: '1.5',
};

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'N/D';
  if (Math.abs(value) < 1e-12) return '0';
  if (Math.abs(value) >= 1e5 || Math.abs(value) < 1e-4) return value.toExponential(6);
  return Number(value.toFixed(8)).toString();
}

function formatMatrixNumber(value: string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return formatNumber(numeric);
}

function variableName(index: number): string {
  return ['x', 'y', 'z', 'w', 'u', 'v'][index] ?? `x${index + 1}`;
}

function createMatrixState(
  dimension: number,
  currentMatrix: string[][],
  currentConstants: string[],
  currentInitials: string[],
) {
  return {
    matrix: Array.from({ length: dimension }, (_, row) =>
      Array.from({ length: dimension }, (_, column) => currentMatrix[row]?.[column] ?? (row === column ? '1' : '0')),
    ),
    constants: Array.from({ length: dimension }, (_, row) => currentConstants[row] ?? '0'),
    initials: Array.from({ length: dimension }, (_, row) => currentInitials[row] ?? '0'),
  };
}

function createPointState(count: number, currentPoints: Array<[string, string]>): Array<[string, string]> {
  return Array.from({ length: count }, (_, index) => currentPoints[index] ?? ([`${index}`, `${index * index + 1}`] as [string, string]));
}

function methodLabel(method: IterativeLinearMethod | 'newton') {
  if (method === 'jacobi') return 'Jacobi';
  if (method === 'gauss-seidel') return 'Gauss-Seidel';
  return 'Newton';
}

function isDiagonallyDominant(matrix: string[][]): boolean {
  return matrix.every((row, rowIndex) => {
    const diagonal = Math.abs(Number(row[rowIndex] ?? 0));
    const offDiagonal = row.reduce((sum, cell, columnIndex) => (
      columnIndex === rowIndex ? sum : sum + Math.abs(Number(cell))
    ), 0);

    return Number.isFinite(diagonal) && diagonal >= offDiagonal;
  });
}

function LinearPreview({ matrix, constants, initials, variables }: {
  matrix: string[][];
  constants: string[];
  initials: string[];
  variables: string[];
}) {
  const buildEquation = (row: string[], rhs: string) => {
    const terms = row.reduce<string[]>((acc, value, columnIndex) => {
      const coefficient = Number(value);
      if (!Number.isFinite(coefficient) || Math.abs(coefficient) < 1e-12) return acc;

      const variable = variables[columnIndex] ?? `x${columnIndex + 1}`;
      const magnitude = Math.abs(coefficient);
      const coefficientText = Math.abs(magnitude - 1) < 1e-12 ? '' : `${formatNumber(magnitude)}·`;
      const term = `${coefficientText}${variable}`;

      if (acc.length === 0) {
        acc.push(coefficient < 0 ? `-${term}` : term);
      } else {
        acc.push(`${coefficient < 0 ? '-' : '+'} ${term}`);
      }

      return acc;
    }, []);

    return `${terms.length ? terms.join(' ') : '0'} = ${formatMatrixNumber(rhs)}`;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-primary/10 bg-[#0f1412] p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Sistema en arranque</p>
        <div className="mt-4 space-y-2 font-mono text-[11px] leading-6 text-slate-100">
          {matrix.map((row, rowIndex) => (
            <p key={`linear-preview-${rowIndex}`} className="break-words [overflow-wrap:anywhere]">
              {buildEquation(row, constants[rowIndex] ?? '0')}
            </p>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.5rem] border border-primary/10 bg-background/35 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Vector inicial</p>
          <p className="mt-3 font-mono text-sm text-white">[{initials.join(', ')}]</p>
        </div>
        <div className="rounded-[1.5rem] border border-primary/10 bg-background/35 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Variables</p>
          <p className="mt-3 font-mono text-sm text-white">{variables.join(', ')}</p>
        </div>
      </div>
    </div>
  );
}

function LinearIterationGraph({ result }: { result: LinearSystemResult }) {
  const graph = useMemo(() => {
    const projectedPoints = result.iterations
      .map((iteration, index) => {
        const vector = iteration.nextVector ?? iteration.previousVector;
        if (!vector || vector.length < 2) return null;

        return {
          x: vector[0],
          y: vector[1],
          label: `I${index + 1}`,
        };
      })
      .filter((point): point is { x: number; y: number; label: string } => point !== null);

    const solutionVector = result.solution;
    if (solutionVector && solutionVector.length >= 2) {
      projectedPoints.push({
        x: solutionVector[0],
        y: solutionVector[1],
        label: 'Sol',
      });
    }

    if (projectedPoints.length === 0) return null;

    const xs = projectedPoints.map((point) => point.x);
    const ys = projectedPoints.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(maxX - minX, 1);
    const spanY = Math.max(maxY - minY, 1);
    const marginX = spanX * 0.22 + 0.25;
    const marginY = spanY * 0.22 + 0.25;

    return {
      points: projectedPoints,
      xMin: minX - marginX,
      xMax: maxX + marginX,
      yMin: minY - marginY,
      yMax: maxY + marginY,
    };
  }, [result]);

  if (!graph) {
    return (
      <div className="flex h-[20rem] items-center justify-center rounded-[1.5rem] border border-dashed border-primary/15 bg-background/30 p-4 text-sm text-muted-foreground">
        La gráfica se activa cuando hay al menos dos variables en el sistema.
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-[#1f2937] bg-[#0b1220] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Gráfica</p>
          <p className="text-sm text-slate-100">Iteraciones proyectadas en 2D</p>
        </div>
        <p className="font-mono text-xs text-slate-400">{graph.points.length} puntos</p>
      </div>

      <div className="overflow-hidden rounded-[1.25rem] border border-[#1f2937] bg-[linear-gradient(180deg,rgba(8,12,17,0.98),rgba(4,7,11,0.98))]">
        <svg viewBox="0 0 900 320" className="block h-[20rem] w-full">
          {Array.from({ length: 5 }, (_, index) => {
            const ratio = index / 4;
            const y = 22 + ratio * 250;
            return (
              <g key={index}>
                <line x1="58" x2="876" y1={y} y2={y} stroke="rgba(148,163,184,0.15)" strokeDasharray="4 6" />
              </g>
            );
          })}
          <line x1="58" x2="876" y1="284" y2="284" stroke="rgba(226,232,240,0.22)" />
          {graph.points.map((point, index) => {
            const x = 58 + ((point.x - graph.xMin) / (graph.xMax - graph.xMin || 1)) * 818;
            const y = 284 - ((point.y - graph.yMin) / (graph.yMax - graph.yMin || 1)) * 250;
            return (
              <g key={point.label}>
                <circle cx={x} cy={y} r={index === graph.points.length - 1 ? 6 : 5} fill={index === graph.points.length - 1 ? 'rgb(125, 211, 252)' : 'rgb(34, 211, 238)'} />
                <text x={x + 8} y={y - 8} fill="rgba(226,232,240,0.8)" fontSize="11" fontFamily="monospace">
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function NewtonCurveGraph({ result }: { result: NewtonInterpolationResult }) {
  const chart = useMemo(() => {
    if (result.nodes.length < 2 || result.coefficients.length < 2) return null;

    const xs = result.nodes.map((node) => node.x);
    const evalPoint = result.evaluatedPoint ?? undefined;
    const xCandidates = evalPoint !== undefined ? [...xs, evalPoint] : xs;
    const minX = Math.min(...xCandidates);
    const maxX = Math.max(...xCandidates);
    const xSpan = Math.max(maxX - minX, 1);
    const xmin = minX - xSpan * 0.2 - 0.4;
    const xmax = maxX + xSpan * 0.2 + 0.4;

    const sampleCount = 180;
    const samples = Array.from({ length: sampleCount + 1 }, (_, index) => {
      const x = xmin + ((xmax - xmin) * index) / sampleCount;
      const y = AdvancedMethods.evaluateNewtonPolynomial(result.nodes, result.coefficients, x);
      return { x, y };
    }).filter((sample) => Number.isFinite(sample.y));

    const yValues = [
      ...samples.map((sample) => sample.y),
      ...result.nodes.map((node) => node.y),
      ...(result.interpolatedValue !== null ? [result.interpolatedValue] : []),
      0,
    ];
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const ySpan = Math.max(maxY - minY, 1);
    const ymin = minY - ySpan * 0.2 - 0.4;
    const ymax = maxY + ySpan * 0.2 + 0.4;

    const width = 900;
    const height = 320;
    const padding = { left: 58, right: 24, top: 22, bottom: 36 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const projectX = (value: number) => padding.left + ((value - xmin) / (xmax - xmin || 1)) * plotWidth;
    const projectY = (value: number) => height - padding.bottom - ((value - ymin) / (ymax - ymin || 1)) * plotHeight;

    return {
      width,
      height,
      padding,
      xmin,
      xmax,
      ymin,
      ymax,
      path: samples.map((sample, index) => `${index === 0 ? 'M' : 'L'} ${projectX(sample.x).toFixed(2)} ${projectY(sample.y).toFixed(2)}`).join(' '),
      points: result.nodes.map((node, index) => ({
        x: projectX(node.x),
        y: projectY(node.y),
        label: `P${index + 1}`,
      })),
      valuePoint: result.evaluatedPoint !== null && result.interpolatedValue !== null
        ? {
            x: projectX(result.evaluatedPoint),
            y: projectY(result.interpolatedValue),
          }
        : null,
      gridLines: Array.from({ length: 5 }, (_, index) => {
        const ratio = index / 4;
        const value = ymax - (ymax - ymin) * ratio;
        return { y: projectY(value), label: formatNumber(value) };
      }),
    };
  }, [result]);

  if (!chart) {
    return (
      <div className="flex h-[20rem] items-center justify-center rounded-[1.5rem] border border-dashed border-primary/15 bg-background/30 p-4 text-sm text-muted-foreground">
        Agrega al menos dos puntos para visualizar el polinomio.
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-[#1f2937] bg-[#0b1220] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Gráfica</p>
          <p className="text-sm text-slate-100">Curva del polinomio de Newton</p>
        </div>
        <p className="font-mono text-xs text-slate-400">
          x = {formatNumber(result.evaluatedPoint)} | P(x) = {formatNumber(result.interpolatedValue)}
        </p>
      </div>

      <div className="overflow-hidden rounded-[1.25rem] border border-[#1f2937] bg-[linear-gradient(180deg,rgba(8,12,17,0.98),rgba(4,7,11,0.98))]">
        <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="block h-[20rem] w-full">
          {chart.gridLines.map((line) => (
            <g key={line.label}>
              <line x1={chart.padding.left} x2={chart.width - chart.padding.right} y1={line.y} y2={line.y} stroke="rgba(148,163,184,0.15)" strokeDasharray="4 6" />
              <text x={chart.padding.left - 10} y={line.y + 4} textAnchor="end" fill="rgba(226,232,240,0.75)" fontSize="11" fontFamily="monospace">
                {line.label}
              </text>
            </g>
          ))}
          <line x1={chart.padding.left} x2={chart.width - chart.padding.right} y1={chart.height - chart.padding.bottom} y2={chart.height - chart.padding.bottom} stroke="rgba(226,232,240,0.22)" />
          <path d={chart.path} fill="none" stroke="rgb(34, 211, 238)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          {chart.points.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="5" fill="rgb(249,115,22)" />
              <text x={point.x + 8} y={point.y - 8} fill="rgba(226,232,240,0.8)" fontSize="11" fontFamily="monospace">
                {point.label}
              </text>
            </g>
          ))}
          {chart.valuePoint ? (
            <circle cx={chart.valuePoint.x} cy={chart.valuePoint.y} r="6" fill="rgb(125,211,252)" />
          ) : null}
        </svg>
      </div>
    </div>
  );
}

function LinearIterationsTable({ result }: { result: LinearSystemResult }) {
  if (result.iterations.length === 0) return null;
  const columns = result.variables.length > 0 ? result.variables : Array.from({ length: result.iterations[0]?.nextVector.length ?? 0 }, (_, index) => `X${index + 1}`);

  return (
    <Card className="overflow-hidden border border-[#1f2937] bg-[#0b1220] shadow-2xl shadow-black/20">
      <CardHeader className="border-b border-[#1f2937] bg-[#0f172a]">
        <div className="flex items-center gap-3">
          <Table2 className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-xl text-slate-100">Tabla de iteraciones</CardTitle>
            <CardDescription className="text-slate-400">Versión simple y directa, como en la referencia.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="h-[28rem]">
          <Table className="min-w-[820px] border-separate border-spacing-0">
            <TableHeader className="sticky top-0 z-10 bg-[#0f172a]">
              <TableRow>
                <TableHead className="h-12 border-b border-[#263041] uppercase text-[10px] font-bold tracking-[0.22em] text-slate-400">Iter</TableHead>
                {columns.map((column) => (
                  <TableHead key={column} className="h-12 border-b border-[#263041] uppercase text-[10px] font-bold tracking-[0.22em] text-slate-400">
                    {column.toUpperCase()}
                  </TableHead>
                ))}
                <TableHead className="h-12 border-b border-[#263041] uppercase text-[10px] font-bold tracking-[0.22em] text-slate-400">EA (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.iterations.map((iteration, rowIndex) => (
                <TableRow
                  key={iteration.iteration}
                  className={cn(
                    'border-b border-[#1f2a3d] transition-colors',
                    rowIndex === result.iterations.length - 1 ? 'bg-emerald-500/8 text-emerald-300' : 'hover:bg-white/3',
                  )}
                >
                  <TableCell className="border-b border-[#1f2a3d] font-mono text-xs text-slate-200">
                    <span className={cn('inline-flex items-center gap-1', rowIndex === result.iterations.length - 1 && 'text-emerald-300')}>
                      {iteration.iteration}
                      {rowIndex === result.iterations.length - 1 ? '✓' : null}
                    </span>
                  </TableCell>
                  {columns.map((_, columnIndex) => (
                    <TableCell key={`${iteration.iteration}-${columnIndex}`} className="border-b border-[#1f2a3d] font-mono text-xs text-slate-100">
                      {formatNumber(iteration.nextVector[columnIndex])}
                    </TableCell>
                  ))}
                  <TableCell className="border-b border-[#1f2a3d] font-mono text-xs text-slate-100">
                    {formatNumber(iteration.ea)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function NewtonTable({ result }: { result: NewtonInterpolationResult }) {
  const headers = [
    'X_I',
    'Y_I = F[X_I]',
    ...Array.from({ length: result.nodes.length - 1 }, (_, index) => {
      const terms = Array.from({ length: index + 2 }, (__unused, termIndex) => `X_I${termIndex === 0 ? '' : `+${termIndex}`}`);
      return `F[${terms.join(',')}]`;
    }),
  ];

  return (
    <Card className="overflow-hidden border border-[#1f2937] bg-[#0b1220] shadow-2xl shadow-black/20">
      <CardHeader className="border-b border-[#1f2937] bg-[#0f172a]">
        <div className="flex items-center gap-3">
          <Table2 className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-xl text-slate-100">Tabla de diferencias divididas</CardTitle>
            <CardDescription className="text-slate-400">Formato más simple, parecido al del documento de referencia.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <ScrollArea className="h-[28rem]">
          <Table className="min-w-[940px] border-separate border-spacing-0 bg-[#0b1220]">
            <TableHeader className="sticky top-0 z-10 bg-[#0f172a]">
              <TableRow>
                {headers.map((header, index) => (
                  <TableHead
                    key={header}
                    className={cn(
                      'h-12 border-b border-[#263041] uppercase text-[10px] font-bold tracking-[0.22em] text-slate-400',
                      index === 0 && 'w-[72px]',
                    )}
                  >
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.nodes.map((node, rowIndex) => (
                <TableRow key={`${node.x}-${node.y}-${rowIndex}`} className="border-b border-[#1f2a3d] hover:bg-white/3">
                  <TableCell className="border-b border-[#1f2a3d] font-mono text-xs text-slate-300">
                    <span className={cn('inline-flex items-center gap-1', rowIndex === result.nodes.length - 1 && 'text-emerald-300')}>
                      {rowIndex}
                      {rowIndex === result.nodes.length - 1 ? '✓' : null}
                    </span>
                  </TableCell>
                  <TableCell className="border-b border-[#1f2a3d] font-mono text-xs text-slate-100">{formatNumber(node.x)}</TableCell>
                  <TableCell className="border-b border-[#1f2a3d] font-mono text-xs text-slate-100">{formatNumber(node.y)}</TableCell>
                  {Array.from({ length: result.nodes.length - 1 }, (_, columnIndex) => (
                    <TableCell key={`cell-${rowIndex}-${columnIndex}`} className="border-b border-[#1f2a3d] font-mono text-xs text-slate-100">
                      {result.table[rowIndex]?.[columnIndex + 1] === null || result.table[rowIndex]?.[columnIndex + 1] === undefined
                        ? '—'
                        : formatNumber(result.table[rowIndex]?.[columnIndex + 1])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function AdvancedMethodsSection() {
  const [method, setMethod] = useState<IterativeLinearMethod | 'newton'>('jacobi');
  const [dimensionText, setDimensionText] = useState('3');
  const [dimension, setDimension] = useState(3);
  const [matrix, setMatrix] = useState<string[][]>([
    ['10', '1', '1'],
    ['2', '10', '1'],
    ['2', '2', '10'],
  ]);
  const [constants, setConstants] = useState<string[]>(['12', '13', '14']);
  const [initials, setInitials] = useState<string[]>(['0', '0', '0']);
  const [tol, setTol] = useState('0.0001');
  const [maxIter, setMaxIter] = useState('40');
  const [linearResult, setLinearResult] = useState<LinearSystemResult | null>(null);

  const [pointCountText, setPointCountText] = useState('4');
  const [pointCount, setPointCount] = useState(4);
  const [points, setPoints] = useState<Array<[string, string]>>([
    ['0', '1'],
    ['1', '2'],
    ['2', '5'],
    ['3', '10'],
  ]);
  const [evaluatedPoint, setEvaluatedPoint] = useState('1.5');
  const [interpolationResult, setInterpolationResult] = useState<NewtonInterpolationResult | null>(null);

  const activeMode = method === 'newton' ? 'interpolation' : 'linear';
  const linearDominance = useMemo(() => isDiagonallyDominant(matrix), [matrix]);

  const parsedPoints = useMemo(() => {
    return points.map(([xValue, yValue]) => [Number(xValue), Number(yValue)] as const);
  }, [points]);

  const applyDimension = () => {
    const nextDimension = Number(dimensionText);
    if (!Number.isInteger(nextDimension)) {
      toast.error('La dimension debe ser un entero');
      return;
    }
    if (nextDimension < MIN_DIMENSION) {
      toast.error('El sistema debe tener al menos 2 variables');
      return;
    }
    if (nextDimension > MAX_DIMENSION) {
      setDimensionText(String(MAX_DIMENSION));
      toast.error(`El maximo permitido es ${MAX_DIMENSION}`);
      return;
    }

    const nextState = createMatrixState(nextDimension, matrix, constants, initials);
    setDimension(nextDimension);
    setMatrix(nextState.matrix);
    setConstants(nextState.constants);
    setInitials(nextState.initials);
    setLinearResult(null);
  };

  const applyPointCount = () => {
    const nextCount = Number(pointCountText);
    if (!Number.isInteger(nextCount)) {
      toast.error('La cantidad de puntos debe ser un entero');
      return;
    }
    if (nextCount < MIN_POINTS) {
      toast.error('Debes ingresar al menos 2 puntos');
      return;
    }
    if (nextCount > MAX_POINTS) {
      setPointCountText(String(MAX_POINTS));
      toast.error(`El maximo permitido es ${MAX_POINTS} puntos`);
      return;
    }

    const nextPoints = createPointState(nextCount, points);
    setPointCount(nextCount);
    setPoints(nextPoints);
    setInterpolationResult(null);
  };

  const applyLinearExample = (example: typeof linearExamples[number]) => {
    const nextState = createMatrixState(example.dimension, example.matrix, example.constants, example.initials);
    setMethod(example.method);
    setDimension(example.dimension);
    setDimensionText(String(example.dimension));
    setMatrix(nextState.matrix);
    setConstants(nextState.constants);
    setInitials(nextState.initials);
    setLinearResult(null);
    toast.success(`Ejemplo ${example.label} cargado`);
  };

  const applyInterpolationExample = () => {
    setMethod('newton');
    const nextPoints = interpolationExample.points.map(([x, y]) => [x, y] as [string, string]);
    setPointCount(nextPoints.length);
    setPointCountText(String(nextPoints.length));
    setPoints(nextPoints);
    setEvaluatedPoint(interpolationExample.evaluatedPoint);
    setInterpolationResult(null);
    toast.success('Ejemplo de Newton cargado');
  };

  const updateMatrixValue = (row: number, column: number, value: string) => {
    setMatrix((current) => current.map((rowValues, rowIndex) => (
      rowIndex === row ? rowValues.map((cell, columnIndex) => (columnIndex === column ? value : cell)) : rowValues
    )));
  };

  const updatePoint = (index: number, key: 0 | 1, value: string) => {
    setPoints((current) => current.map((point, pointIndex) => (
      pointIndex === index ? (key === 0 ? [value, point[1]] : [point[0], value]) : point
    )));
  };

  const handleCalculate = () => {
    if (activeMode === 'linear') {
      const tolerance = Number(tol);
      const iterations = Number.parseInt(maxIter, 10);
      if (!Number.isFinite(tolerance) || tolerance <= 0) return toast.error('La tolerancia debe ser positiva');
      if (!Number.isInteger(iterations) || iterations <= 0) return toast.error('Las iteraciones maximas deben ser un entero positivo');
      if (matrix.some((row) => row.some((value) => Number.isNaN(Number(value))))) {
        return toast.error('Todos los coeficientes de la matriz deben ser numericos');
      }
      if (constants.some((value) => Number.isNaN(Number(value)))) {
        return toast.error('Todos los terminos independientes deben ser numericos');
      }
      if (initials.some((value) => Number.isNaN(Number(value)))) {
        return toast.error('Todos los valores iniciales deben ser numericos');
      }

      const numericMatrix = matrix.map((row) => row.map(Number));
      const numericConstants = constants.map(Number);
      const numericInitials = initials.map(Number);
      const variables = Array.from({ length: dimension }, (_, index) => variableName(index));

      const result = method === 'jacobi'
        ? AdvancedMethods.jacobi(numericMatrix, numericConstants, numericInitials, tolerance, iterations, variables)
        : AdvancedMethods.gaussSeidel(numericMatrix, numericConstants, numericInitials, tolerance, iterations, variables);

      setLinearResult(result);
      setInterpolationResult(null);
      result.converged ? toast.success(`${methodLabel(method)} ejecutado correctamente`) : toast.warning(result.message);
      return;
    }

    const pointsPayload: NewtonNode[] = parsedPoints.map(([x, y]) => ({ x, y }));
    if (pointsPayload.some((point) => Number.isNaN(point.x) || Number.isNaN(point.y))) {
      return toast.error('Todos los puntos deben ser numericos');
    }

    const point = Number(evaluatedPoint);
    const result = AdvancedMethods.interpolateNewton(pointsPayload, Number.isFinite(point) ? point : undefined);
    setInterpolationResult(result);
    setLinearResult(null);
    result.converged ? toast.success('Polinomio de Newton calculado') : toast.warning(result.message);
  };

  const linearModeSummary = linearResult ?? null;
  const interpolationModeSummary = interpolationResult ?? null;

  return (
    <section className="space-y-6">
      <Card className="overflow-hidden border-primary/10 bg-card/70 shadow-2xl shadow-black/25 backdrop-blur-xl">
        <CardHeader className="border-b border-primary/10 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.2),transparent_38%),linear-gradient(135deg,rgba(8,12,10,0.96),rgba(15,21,18,0.86))]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Plataforma académica premium</Badge>
                <Badge variant="outline" className="border-primary/20 text-primary/80">Jacobi, Seidel y Newton</Badge>
              </div>
              <div>
                <CardTitle className="text-3xl font-black tracking-tight text-primary sm:text-4xl">
                  Métodos avanzados de resolución
                </CardTitle>
                <CardDescription className="mt-2 max-w-3xl text-base">
                  Esta vista replica la intención visual del documento: paneles de cálculo, tablas densas, gráficas en vivo y un lenguaje visual más técnico y ceremonial.
                </CardDescription>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[440px] lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Modo</p>
                <p className="mt-2 text-2xl font-black text-white">{activeMode === 'linear' ? 'Sistemas' : 'Interpolación'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Dimensión</p>
                <p className="mt-2 text-sm font-semibold text-white">{dimension} x {dimension}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Puntos</p>
                <p className="mt-2 text-sm font-semibold text-white">{pointCount}</p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="space-y-6">
          <Card className="border-primary/10 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl text-primary">Selector de método</CardTitle>
                  <CardDescription>Elige el algoritmo y conservamos la estética de panel técnico premium.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={method === 'jacobi' ? 'default' : 'outline'}
                    onClick={() => setMethod('jacobi')}
                    className={cn('gap-2', method === 'jacobi' ? 'bg-primary text-primary-foreground' : 'border-primary/20 bg-background/40')}
                  >
                    <Layers3 className="h-4 w-4" />
                    Jacobi
                  </Button>
                  <Button
                    type="button"
                    variant={method === 'gauss-seidel' ? 'default' : 'outline'}
                    onClick={() => setMethod('gauss-seidel')}
                    className={cn('gap-2', method === 'gauss-seidel' ? 'bg-primary text-primary-foreground' : 'border-primary/20 bg-background/40')}
                  >
                    <Grid3x3 className="h-4 w-4" />
                    Gauss-Seidel
                  </Button>
                  <Button
                    type="button"
                    variant={method === 'newton' ? 'default' : 'outline'}
                    onClick={() => setMethod('newton')}
                    className={cn('gap-2', method === 'newton' ? 'bg-primary text-primary-foreground' : 'border-primary/20 bg-background/40')}
                  >
                    <Sparkles className="h-4 w-4" />
                    Newton
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {activeMode === 'linear' ? (
            <Card className="border-primary/10 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-primary">
                      {method === 'jacobi' ? 'Jacobi iterativo' : 'Gauss-Seidel iterativo'}
                    </CardTitle>
                    <CardDescription>Configuración del sistema, vector inicial y control numérico.</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {linearExamples.map((example) => (
                      <Button
                        key={example.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyLinearExample(example)}
                        className="border-primary/20 bg-background/40 hover:bg-primary/10"
                      >
                        {example.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <Label htmlFor="dimension-linear" className="text-[11px] font-bold uppercase tracking-widest text-primary/70">
                      Número de variables
                    </Label>
                    <Input
                      id="dimension-linear"
                      type="number"
                      min={MIN_DIMENSION}
                      max={MAX_DIMENSION}
                      step={1}
                      value={dimensionText}
                      onChange={(event) => setDimensionText(event.target.value)}
                      className="h-12 border-primary/20 bg-background/50"
                    />
                  </div>
                  <Button type="button" onClick={applyDimension} className="h-12 self-end px-6">
                    Aplicar dimensión
                  </Button>
                </div>

                <div className="space-y-4 rounded-[1.5rem] border border-primary/10 bg-[#0f1412] p-4">
                  <div className="flex items-center gap-2">
                    <Table2 className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-primary">Matriz A y vector b</p>
                  </div>
                  <div className="space-y-3">
                    {matrix.map((row, rowIndex) => (
                      <div
                        key={`matrix-row-${rowIndex}`}
                        className="grid gap-3"
                        style={{ gridTemplateColumns: `repeat(${dimension}, minmax(0, 1fr)) minmax(112px, 128px)` }}
                      >
                        {row.map((value, columnIndex) => (
                          <Input
                            key={`a-${rowIndex}-${columnIndex}`}
                            value={value}
                            onChange={(event) => updateMatrixValue(rowIndex, columnIndex, event.target.value)}
                            className="h-11 border-primary/20 bg-background/60 font-mono"
                            aria-label={`A${rowIndex + 1}${columnIndex + 1}`}
                          />
                        ))}
                        <Input
                          value={constants[rowIndex]}
                          onChange={(event) => setConstants((current) => current.map((item, index) => (index === rowIndex ? event.target.value : item)))}
                          className="h-11 border-primary/20 bg-background/60 font-mono"
                          aria-label={`b${rowIndex + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div className="space-y-4 rounded-[1.5rem] border border-primary/10 bg-background/30 p-4">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-primary">Vector inicial</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {initials.map((value, index) => (
                        <div key={`x0-${index}`} className="space-y-2">
                          <Label htmlFor={`x0-${index}`} className="text-[11px] font-bold uppercase tracking-widest text-primary/70">
                            {`${variableName(index)}0`}
                          </Label>
                          <Input
                            id={`x0-${index}`}
                            type="number"
                            step="any"
                            value={value}
                            onChange={(event) => setInitials((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))}
                            className="h-11 border-primary/20 bg-background/60"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 rounded-[1.5rem] border border-primary/10 bg-[linear-gradient(135deg,rgba(6,182,212,0.1),rgba(15,21,18,0.35))] p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-primary">Control numérico</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="tol-linear" className="text-[11px] font-bold uppercase tracking-widest text-primary/70">
                          Tolerancia
                        </Label>
                        <Input
                          id="tol-linear"
                          type="number"
                          step="any"
                          value={tol}
                          onChange={(event) => setTol(event.target.value)}
                          className="h-11 border-primary/20 bg-background/60"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="iter-linear" className="text-[11px] font-bold uppercase tracking-widest text-primary/70">
                          Iteraciones max
                        </Label>
                        <Input
                          id="iter-linear"
                          type="number"
                          value={maxIter}
                          onChange={(event) => setMaxIter(event.target.value)}
                          className="h-11 border-primary/20 bg-background/60"
                        />
                      </div>
                    </div>
                    <div className="rounded-[1.25rem] border border-primary/10 bg-background/35 p-4 text-sm text-muted-foreground">
                      El método usa el criterio <span className="font-semibold text-primary">Ea</span> y la norma residual para detenerse.
                    </div>
                    <div className="rounded-[1.25rem] border border-primary/10 bg-background/35 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Dominancia diagonal</p>
                      <p className="mt-2 text-sm font-semibold text-white">{linearDominance ? 'Sugerida' : 'No garantizada'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-primary/10 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-primary">Polinomio de Newton</CardTitle>
                    <CardDescription>Tabla de puntos y diferencias divididas como en la referencia.</CardDescription>
                  </div>
                  <Button type="button" variant="outline" onClick={applyInterpolationExample} className="border-primary/20 bg-background/40 hover:bg-primary/10">
                    Cargar ejemplo
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <Label htmlFor="points-count" className="text-[11px] font-bold uppercase tracking-widest text-primary/70">
                      Número de puntos
                    </Label>
                    <Input
                      id="points-count"
                      type="number"
                      min={MIN_POINTS}
                      max={MAX_POINTS}
                      step={1}
                      value={pointCountText}
                      onChange={(event) => setPointCountText(event.target.value)}
                      className="h-12 border-primary/20 bg-background/50"
                    />
                  </div>
                  <Button type="button" onClick={applyPointCount} className="h-12 self-end px-6">
                    Aplicar puntos
                  </Button>
                </div>

                <div className="space-y-3 rounded-[1.5rem] border border-primary/10 bg-[#0f1412] p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-primary">Tabla de puntos</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {points.map((point, index) => (
                      <div key={`point-${index}`} className="grid gap-3 rounded-[1.25rem] border border-primary/10 bg-background/40 p-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`point-x-${index}`} className="text-[11px] font-bold uppercase tracking-widest text-primary/70">
                            x{index}
                          </Label>
                          <Input
                            id={`point-x-${index}`}
                            type="number"
                            step="any"
                            value={point[0]}
                            onChange={(event) => updatePoint(index, 0, event.target.value)}
                            className="h-11 border-primary/20 bg-background/60"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`point-y-${index}`} className="text-[11px] font-bold uppercase tracking-widest text-primary/70">
                            f(x{index})
                          </Label>
                          <Input
                            id={`point-y-${index}`}
                            type="number"
                            step="any"
                            value={point[1]}
                            onChange={(event) => updatePoint(index, 1, event.target.value)}
                            className="h-11 border-primary/20 bg-background/60"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                  <div className="space-y-2">
                    <Label htmlFor="eval-point" className="text-[11px] font-bold uppercase tracking-widest text-primary/70">
                      Valor a evaluar
                    </Label>
                    <Input
                      id="eval-point"
                      type="number"
                      step="any"
                      value={evaluatedPoint}
                      onChange={(event) => setEvaluatedPoint(event.target.value)}
                      className="h-12 border-primary/20 bg-background/50"
                    />
                  </div>
                  <div className="rounded-[1.25rem] border border-primary/10 bg-[linear-gradient(135deg,rgba(245,158,11,0.1),rgba(15,21,18,0.35))] p-4">
                    <p className="text-sm font-semibold text-primary">Forma del polinomio</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      P(x) = a0 + a1(x - x0) + a2(x - x0)(x - x1) + ...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            type="button"
            onClick={handleCalculate}
            className="w-full bg-primary py-7 text-lg font-bold text-primary-foreground shadow-xl transition-transform hover:scale-[1.01] hover:bg-primary/85"
          >
            {activeMode === 'linear' ? `Resolver ${methodLabel(method)} ` : 'Construir polinomio de Newton'}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          <Card className="border-primary/10 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-primary">
                {activeMode === 'linear' ? 'Vista previa del sistema' : 'Vista previa de interpolación'}
              </CardTitle>
              <CardDescription>
                {activeMode === 'linear'
                  ? 'Alineamos la vista a la lógica del documento: fórmula, vector inicial y métricas de arranque.'
                  : 'Mostramos la estructura inicial y la lectura visual del polinomio de Newton.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeMode === 'linear' ? (
                <LinearPreview matrix={matrix} constants={constants} initials={initials} variables={Array.from({ length: dimension }, (_, index) => variableName(index))} />
              ) : (
                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-primary/10 bg-background/30 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Puntos</p>
                    <div className="mt-3 space-y-2 font-mono text-xs text-slate-100">
                      {points.map((point, index) => (
                        <p key={`preview-point-${index}`}>
                          ({formatNumber(Number(point[0]))}, {formatNumber(Number(point[1]))})
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] border border-primary/10 bg-background/35 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Evaluación</p>
                    <p className="mt-2 font-mono text-sm text-white">x = {evaluatedPoint || 'N/D'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {linearModeSummary ? (
            <Card className="border-primary/10 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-primary">Resultado iterativo</CardTitle>
                    <CardDescription>Resumen rápido del método y lectura de convergencia.</CardDescription>
                  </div>
                  <Badge variant={linearModeSummary.converged ? 'default' : 'destructive'} className="bg-primary text-primary-foreground">
                    {linearModeSummary.converged ? 'Convergente' : 'No convergente'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-[1.25rem] border border-primary/10 bg-background/40 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Iteraciones</p>
                    <p className="mt-2 text-2xl font-black text-primary">{linearModeSummary.iterations.length}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-primary/10 bg-background/40 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Error final</p>
                    <p className="mt-2 font-mono text-sm text-white">{formatNumber(linearModeSummary.iterations.at(-1)?.ea ?? null)}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-primary/10 bg-background/40 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Solución</p>
                    <p className="mt-2 font-mono text-sm text-white">
                      {linearModeSummary.solution ? `[${linearModeSummary.solution.map((value) => formatNumber(value)).join(', ')}]` : 'N/D'}
                    </p>
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-primary/10 bg-background/35 p-4 text-sm text-muted-foreground">
                  {linearModeSummary.message}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {linearModeSummary ? (
            <Card className="border-primary/10 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-primary">Gráfica del sistema</CardTitle>
                <CardDescription>Versión limpia sin panel vacío al lado.</CardDescription>
              </CardHeader>
              <CardContent>
                <LinearIterationGraph result={linearModeSummary} />
              </CardContent>
            </Card>
          ) : null}

          {linearModeSummary ? (
            <Card className="border-primary/10 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-primary">Gráfica de convergencia</CardTitle>
                <CardDescription>La curva sigue el error absoluto por iteración, como en un panel técnico de seguimiento.</CardDescription>
              </CardHeader>
              <CardContent>
                <ConvergenceChart iterations={linearModeSummary.iterations} />
              </CardContent>
            </Card>
          ) : null}

          {interpolationModeSummary ? (
            <Card className="border-primary/10 bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-primary">Polinomio interpolante</CardTitle>
                    <CardDescription>Lectura algebraica y gráfica del resultado Newton.</CardDescription>
                  </div>
                  <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Newton</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.5rem] border border-primary/10 bg-background/35 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Polinomio</p>
                  <p className="mt-2 font-mono text-sm break-words [overflow-wrap:anywhere] text-white">{interpolationModeSummary.polynomialExpression}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1.25rem] border border-primary/10 bg-background/40 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Valor evaluado</p>
                    <p className="mt-2 font-mono text-sm text-white">{formatNumber(interpolationModeSummary.evaluatedPoint)}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-primary/10 bg-background/40 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">P(x)</p>
                    <p className="mt-2 font-mono text-sm text-white">{formatNumber(interpolationModeSummary.interpolatedValue)}</p>
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-primary/10 bg-background/35 p-4 text-sm text-muted-foreground">
                  {interpolationModeSummary.message}
                </div>
                <NewtonCurveGraph result={interpolationModeSummary} />
              </CardContent>
            </Card>
          ) : null}

          {linearModeSummary || interpolationModeSummary ? (
            activeMode === 'linear' && linearModeSummary ? (
              <LinearIterationsTable result={linearModeSummary} />
            ) : interpolationModeSummary ? (
              <NewtonTable result={interpolationModeSummary} />
            ) : null
          ) : null}
        </div>
      </div>
    </section>
  );
}

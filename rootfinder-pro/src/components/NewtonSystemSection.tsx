import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, Download, FunctionSquare, History, LineChart, Pencil, RefreshCw, Sigma, Sparkles, Target, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GeoGebraGraph } from '@/components/GeoGebraGraph';
import { ConvergenceChart } from '@/components/shared/ConvergenceChart';
import { LOAD_SYSTEM_HISTORY_EVENT, SYSTEM_HISTORY_KEY, SYSTEM_HISTORY_UPDATED_EVENT } from '@/lib/historyKeys';
import { MathEvaluator } from '@/lib/mathEvaluator';
import { NumericalMethods } from '@/lib/numericalMethods';
import { cn } from '@/lib/utils';
import { SystemCalculationResult } from '@/types';

type SystemHistoryItem = SystemCalculationResult & {
  id: string;
  timestamp: number;
  label?: string;
};

const MIN_DIMENSION = 2;
const MAX_DIMENSION = 6;

const variableName = (index: number) => {
  const names = ['x', 'y', 'z', 'w', 'u', 'v'];
  return names[index] ?? `x${index + 1}`;
};

const defaultFunction = (index: number, n: number) => {
  if (n === 2) return ['x^2 + y^2 - 4', 'x - y - 1'][index] ?? '';
  if (n === 3) return ['x + y + z - 3', 'x^2 + y^2 + z^2 - 5', 'x - z'][index] ?? '';
  return `${variableName(index)} - ${index + 1}`;
};

const EXAMPLES = [
  {
    label: 'Sistema 2x2',
    dimension: 2,
    functions: ['x^2 + y^2 - 4', 'x - y - 1'],
    initialValues: ['1.5', '0.5'],
  },
  {
    label: 'Sistema 3x3',
    dimension: 3,
    functions: ['x + y + z - 3', 'x^2 + y^2 + z^2 - 5', 'x - z'],
    initialValues: ['1.2', '1', '0.8'],
  },
  {
    label: 'Sistema 4x4',
    dimension: 4,
    functions: ['x + y - 2', 'z + w - 2', 'x^2 + z^2 - 2', 'y^2 + w^2 - 2'],
    initialValues: ['1', '1', '1', '1'],
  },
];

const formatNumber = (value: number) => {
  if (!Number.isFinite(value)) return 'N/A';
  return Math.abs(value) >= 1e5 || (Math.abs(value) > 0 && Math.abs(value) < 1e-4)
    ? value.toExponential(6)
    : value.toFixed(6);
};

const solutionValues = (result: SystemCalculationResult | null) => result?.solution?.values ?? [];

const residualNorm = (values?: number[]) => {
  if (!values?.length) return null;
  return Math.sqrt(values.reduce((sum, value) => sum + value ** 2, 0));
};

const buildDimensionState = (
  nextDimension: number,
  currentVariables: string[],
  currentFunctions: string[],
  currentInitialValues: string[],
) => ({
  variables: Array.from({ length: nextDimension }, (_, index) => currentVariables[index] ?? variableName(index)),
  functions: Array.from({ length: nextDimension }, (_, index) => currentFunctions[index] ?? defaultFunction(index, nextDimension)),
  initialValues: Array.from({ length: nextDimension }, (_, index) => currentInitialValues[index] ?? '1'),
});

const clampDimension = (value: number) => Math.min(Math.max(value, MIN_DIMENSION), MAX_DIMENSION);

const estimateConvergenceLabel = (result: SystemCalculationResult | null) => {
  const values = result?.iterations
    .map((iteration) => iteration.ea)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0) ?? [];

  if (values.length < 3) return 'Insuficiente';

  const rates: number[] = [];
  for (let index = 2; index < values.length; index += 1) {
    const current = values[index];
    const previous = values[index - 1];
    const beforePrevious = values[index - 2];
    if (current > 0 && previous > 0 && beforePrevious > 0 && previous !== beforePrevious) {
      const ratio = Math.log(current / previous) / Math.log(previous / beforePrevious);
      if (Number.isFinite(ratio)) rates.push(ratio);
    }
  }

  if (!rates.length) return 'No definida';
  const average = rates.reduce((sum, value) => sum + value, 0) / rates.length;
  if (average > 1.8) return 'Cuadratica';
  if (average > 1.1) return 'Superlineal';
  return 'Lineal';
};

export function NewtonSystemSection() {
  const [dimensionText, setDimensionText] = useState('2');
  const [dimension, setDimension] = useState(2);
  const [variables, setVariables] = useState(['x', 'y']);
  const [functions, setFunctions] = useState(['x^2 + y^2 - 4', 'x - y - 1']);
  const [initialValues, setInitialValues] = useState(['1.5', '0.5']);
  const [tol, setTol] = useState('0.0001');
  const [maxIter, setMaxIter] = useState('25');
  const [result, setResult] = useState<SystemCalculationResult | null>(null);
  const [history, setHistory] = useState<SystemHistoryItem[]>([]);
  const [historyLabel, setHistoryLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [graphZoom, setGraphZoom] = useState(1);
  const [expandedIteration, setExpandedIteration] = useState<number | null>(0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SYSTEM_HISTORY_KEY);
      setHistory(raw ? JSON.parse(raw) : []);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    const handleExternalLoad = (event: Event) => {
      const detail = (event as CustomEvent<SystemHistoryItem>).detail;
      if (!detail) return;
      loadCalculation(detail);
    };

    window.addEventListener(LOAD_SYSTEM_HISTORY_EVENT, handleExternalLoad as EventListener);
    return () => window.removeEventListener(LOAD_SYSTEM_HISTORY_EVENT, handleExternalLoad as EventListener);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SYSTEM_HISTORY_KEY, JSON.stringify(history.slice(0, 15)));
      window.dispatchEvent(new Event(SYSTEM_HISTORY_UPDATED_EVENT));
    } catch {
      // Ignore local storage failures.
    }
  }, [history]);

  useEffect(() => {
    setExpandedIteration(result?.iterations.length ? 0 : null);
  }, [result]);

  const preview = useMemo(() => {
    const parsedValues = initialValues.map((value) => parseFloat(value));
    if (functions.some((fn) => !fn.trim()) || parsedValues.some(Number.isNaN)) return null;

    try {
      const scope = variables.reduce<Record<string, number>>((acc, variable, index) => {
        acc[variable] = parsedValues[index];
        return acc;
      }, {});

      return {
        fValues: functions.map((fn) => MathEvaluator.evaluateWithScope(fn, scope)),
        derivatives: functions.map((fn) =>
          variables.map((variable) => MathEvaluator.getPartialDerivativeExpression(fn, variable)),
        ),
        jacobian: functions.map((fn) =>
          variables.map((variable) => MathEvaluator.partialDerivative(fn, variable, scope)),
        ),
      };
    } catch {
      return null;
    }
  }, [functions, initialValues, variables]);

  const systemGraph = useMemo(() => {
    const points = result?.iterations
      .map((item) => item.vector ?? [])
      .filter((item) => item.length >= 2)
      .map((item, index) => ({ x: item[0], y: item[1], label: `I${index + 1}` })) ?? [];
    const solution = solutionValues(result);

    if (solution.length >= 2) {
      points.push({ x: solution[0], y: solution[1], label: 'Sol' });
    }

    if (points.length === 0) {
      return null;
    }

    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const marginX = Math.max((maxX - minX) * 0.18, 0.5);
    const marginY = Math.max((maxY - minY) * 0.18, 0.5);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const spanX = Math.max((maxX - minX + marginX * 2) / graphZoom, 0.05);
    const spanY = Math.max((maxY - minY + marginY * 2) / graphZoom, 0.05);
    const pointList = points.map((point) => `(${point.x},${point.y})`).join(',');

    return {
      points,
      commands: [
        `sysPts={${pointList}}`,
        'sysPath=Polyline(sysPts)',
        'SetColor(sysPath,16,185,129)',
        'SetLineThickness(sysPath,6)',
      ],
      xMin: centerX - spanX / 2,
      xMax: centerX + spanX / 2,
      yMin: centerY - spanY / 2,
      yMax: centerY + spanY / 2,
    };
  }, [graphZoom, result]);

  const iterationSummary = useMemo(() => {
    return result?.iterations.map((iteration) => ({
      iteration: iteration.iteration,
      vector: iteration.vector ?? [],
      nextVector: iteration.nextVector ?? [],
      delta: iteration.delta ?? [],
      fValues: iteration.fValues ?? [],
      jacobian: iteration.jacobian ?? [],
      ea: iteration.ea,
      er: iteration.er,
      residual: residualNorm(iteration.fValues),
    })) ?? [];
  }, [result]);

  const zoomSystemGraph = (direction: 'in' | 'out') => {
    setGraphZoom((current) => {
      const next = direction === 'in' ? current * 1.25 : current / 1.25;
      return Math.min(Math.max(next, 0.2), 80);
    });
  };

  const applyDimension = () => {
    const nextDimension = Number(dimensionText);
    if (!Number.isInteger(nextDimension)) {
      toast.error('El numero de ecuaciones debe ser un entero');
      return;
    }
    if (nextDimension < MIN_DIMENSION) {
      toast.error('El sistema debe tener al menos 2 ecuaciones');
      return;
    }
    if (nextDimension > MAX_DIMENSION) {
      setDimensionText(String(MAX_DIMENSION));
      toast.error(`El maximo permitido es ${MAX_DIMENSION} ecuaciones`);
      return;
    }

    const nextState = buildDimensionState(nextDimension, variables, functions, initialValues);
    setDimension(nextDimension);
    setVariables(nextState.variables);
    setFunctions(nextState.functions);
    setInitialValues(nextState.initialValues);
    setResult(null);
  };

  const applyExample = (example: typeof EXAMPLES[number]) => {
    const nextDimension = clampDimension(example.dimension);
    const nextState = buildDimensionState(nextDimension, example.functions.map((_, index) => variableName(index)), example.functions, example.initialValues);

    setDimension(nextDimension);
    setDimensionText(String(nextDimension));
    setVariables(nextState.variables);
    setFunctions(nextState.functions);
    setInitialValues(nextState.initialValues);
    setResult(null);
    setGraphZoom(1);
    toast.success(`Ejemplo ${example.label} cargado`);
  };

  const updateFunction = (index: number, value: string) => {
    setFunctions((current) => current.map((item, currentIndex) => (currentIndex === index ? value : item)));
  };

  const updateInitialValue = (index: number, value: string) => {
    setInitialValues((current) => current.map((item, currentIndex) => (currentIndex === index ? value : item)));
  };

  const handleCalculate = () => {
    if (dimension > MAX_DIMENSION) {
      toast.error(`El maximo permitido es ${MAX_DIMENSION} ecuaciones`);
      return;
    }
    if (functions.some((fn) => !fn.trim())) return toast.error('Debes ingresar todas las ecuaciones del sistema');

    const parsedValues = initialValues.map((value) => parseFloat(value));
    const tolerance = parseFloat(tol);
    const iterations = parseInt(maxIter, 10);

    if (parsedValues.some(Number.isNaN)) return toast.error('Todos los valores iniciales deben ser numericos');
    if (Number.isNaN(tolerance) || tolerance <= 0) return toast.error('La tolerancia debe ser positiva');
    if (!Number.isInteger(iterations) || iterations <= 0) return toast.error('Las iteraciones maximas deben ser un entero positivo');

    try {
      const calculation = NumericalMethods.newtonRaphsonSystem(functions, variables, parsedValues, tolerance, iterations);
      setResult(calculation);
      setHistory((current) => [
        {
          ...calculation,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          label: historyLabel.trim(),
        },
        ...current,
      ].slice(0, 15));
      setHistoryLabel('');
      setGraphZoom(1);
      calculation.converged ? toast.success('Sistema resuelto con Newton-Raphson') : toast.warning(calculation.message);
    } catch (error: any) {
      toast.error('Error matematico: ' + error.message);
    }
  };

  const loadCalculation = (item: SystemHistoryItem) => {
    const loadedFunctions = (item.functions ?? [item.functionF1, item.functionF2].filter(Boolean)).slice(0, MAX_DIMENSION);
    const loadedVariables = (item.variables ?? ['x', 'y']).slice(0, MAX_DIMENSION);
    const loadedInitialValues = (item.params.initialValues ?? [item.params.x0, item.params.y0].filter((value: unknown) => value !== undefined))
      .slice(0, MAX_DIMENSION)
      .map((value: unknown) => value?.toString() ?? '1');
    const requestedDimension = Math.max(loadedFunctions.length, loadedVariables.length, loadedInitialValues.length, MIN_DIMENSION);
    const nextDimension = clampDimension(requestedDimension);
    const nextState = buildDimensionState(nextDimension, loadedVariables, loadedFunctions, loadedInitialValues);

    setDimension(nextDimension);
    setDimensionText(String(nextDimension));
    setVariables(nextState.variables);
    setFunctions(nextState.functions);
    setInitialValues(nextState.initialValues);
    setTol(item.params.tol?.toString() ?? '');
    setMaxIter(item.params.maxIter?.toString() ?? '');
    setResult(item);
    setGraphZoom(1);

    if (requestedDimension > MAX_DIMENSION) {
      toast.warning(`El historial fue ajustado a ${MAX_DIMENSION} ecuaciones como maximo`);
    } else {
      toast.success('Calculo del sistema cargado del historial');
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    window.localStorage.removeItem(SYSTEM_HISTORY_KEY);
    window.dispatchEvent(new Event(SYSTEM_HISTORY_UPDATED_EVENT));
    toast.success('Historial del sistema limpiado');
  };

  const handleExportHistory = () => {
    if (history.length === 0) return toast.error('No hay historial del sistema para exportar');

    const headers = ['Fecha', 'Etiqueta', 'Dimension', 'Ecuaciones', 'Vector inicial', 'Solucion', 'Iteraciones', 'Convergencia'];
    const rows = history.map((item) => [
      new Date(item.timestamp).toLocaleString(),
      `"${item.label ?? ''}"`,
      item.variables?.length ?? 2,
      `"${(item.functions ?? [item.functionF1, item.functionF2]).join(' | ')}"`,
      `"${(item.params.initialValues ?? [item.params.x0, item.params.y0]).join(' | ')}"`,
      `"${solutionValues(item).map(formatNumber).join(' | ')}"`,
      item.iterations.length,
      item.converged ? 'Si' : 'No',
    ]);

    const blob = new Blob([[headers, ...rows].map((row) => row.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'historial_sistema_newton.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Historial exportado');
  };

  const solution = solutionValues(result);
  const finalResidual = result?.iterations.length ? residualNorm(result.iterations[result.iterations.length - 1]?.fValues) : null;
  const convergenceLabel = estimateConvergenceLabel(result);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Card className="overflow-hidden border-primary/10 bg-card/60 shadow-2xl backdrop-blur-sm">
        <CardHeader className="border-b border-primary/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.2),transparent_42%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.72))]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary/15 text-primary hover:bg-primary/15">Newton Multivariable</Badge>
                <Badge variant="outline" className="border-primary/20 text-primary/80">Maximo 6 ecuaciones</Badge>
              </div>
              <div>
                <CardTitle className="text-3xl font-black tracking-tight text-primary">
                  Newton-Raphson para Ecuaciones No Lineales
                </CardTitle>
                <CardDescription className="mt-2 max-w-3xl text-base">
                  Reorganicé esta vista para que se acerque al archivo de referencia, pero conservando el diseño y los componentes de nuestra app.
                </CardDescription>
              </div>
            </div>

            <div className="grid min-w-[260px] gap-3 sm:grid-cols-3 lg:w-[340px] lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Sistema</p>
                <p className="mt-2 text-2xl font-black text-white">{dimension} x {dimension}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Variables</p>
                <p className="mt-2 font-mono text-sm text-white">{variables.join(', ')}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Metodo</p>
                <p className="mt-2 text-sm font-semibold text-white">Jacobiana dinamica + pivoteo parcial</p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.95fr]">
        <div className="space-y-6">
          <Card className="border-primary/10 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl text-primary">Configuracion del sistema</CardTitle>
                  <CardDescription>Define dimension, ecuaciones, aproximaciones iniciales y parametros del metodo.</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((example) => (
                    <Button
                      key={example.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyExample(example)}
                      className="border-primary/20 bg-background/40 hover:bg-primary/10"
                    >
                      {example.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div className="space-y-3">
                  <Label htmlFor="dimension-system" className="text-[12px] font-bold uppercase tracking-widest text-primary/70">
                    Numero de ecuaciones
                  </Label>
                  <Input
                    id="dimension-system"
                    type="number"
                    min={MIN_DIMENSION}
                    max={MAX_DIMENSION}
                    step={1}
                    value={dimensionText}
                    onChange={(event) => setDimensionText(event.target.value)}
                    className="h-12 border-primary/20 bg-background/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    El sistema admite entre {MIN_DIMENSION} y {MAX_DIMENSION} ecuaciones no lineales.
                  </p>
                </div>
                <Button type="button" onClick={applyDimension} className="h-12 self-end px-6">
                  Aplicar tamano
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {functions.map((fn, index) => (
                  <div key={index} className="rounded-2xl border border-primary/10 bg-background/35 p-4">
                    <Label htmlFor={`f-system-${index}`} className="text-[12px] font-bold uppercase tracking-widest text-primary/70">
                      {`Ecuacion F${index + 1}(${variables.join(', ')})`}
                    </Label>
                    <Input
                      id={`f-system-${index}`}
                      value={fn}
                      onChange={(event) => updateFunction(index, event.target.value)}
                      className="mt-3 h-12 border-primary/20 bg-background/60 font-mono text-base"
                    />
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4 rounded-3xl border border-primary/10 bg-background/30 p-5">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-primary">Vector inicial y control</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {variables.map((variable, index) => (
                      <div className="space-y-2" key={variable}>
                        <Label htmlFor={`initial-system-${variable}`} className="text-[11px] font-bold uppercase tracking-widest text-primary/70">
                          {`${variable}0`}
                        </Label>
                        <Input
                          id={`initial-system-${variable}`}
                          type="number"
                          step="any"
                          value={initialValues[index]}
                          onChange={(event) => updateInitialValue(index, event.target.value)}
                          className="h-11 border-primary/20 bg-background/60"
                        />
                      </div>
                    ))}
                    <div className="space-y-2">
                      <Label htmlFor="tol-system" className="text-[11px] font-bold uppercase tracking-widest text-primary/70">
                        Tolerancia
                      </Label>
                      <Input
                        id="tol-system"
                        type="number"
                        step="any"
                        value={tol}
                        onChange={(event) => setTol(event.target.value)}
                        className="h-11 border-primary/20 bg-background/60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="iter-system" className="text-[11px] font-bold uppercase tracking-widest text-primary/70">
                        Iteraciones max
                      </Label>
                      <Input
                        id="iter-system"
                        type="number"
                        value={maxIter}
                        onChange={(event) => setMaxIter(event.target.value)}
                        className="h-11 border-primary/20 bg-background/60"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-3xl border border-primary/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.1),rgba(15,23,42,0.35))] p-5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-primary">Flujo del metodo</p>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-primary/10 bg-background/35 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Paso 1</p>
                      <p className="mt-2 font-semibold">Evalua F(Xk)</p>
                      <p className="mt-1 text-sm text-muted-foreground">Calcula el vector residual con las {dimension} ecuaciones ingresadas.</p>
                    </div>
                    <div className="rounded-2xl border border-primary/10 bg-background/35 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Paso 2</p>
                      <p className="mt-2 font-semibold">Construye J(Xk)</p>
                      <p className="mt-1 text-sm text-muted-foreground">Deriva respecto a {variables.join(', ')} y forma la matriz {dimension} x {dimension}.</p>
                    </div>
                    <div className="rounded-2xl border border-primary/10 bg-background/35 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Paso 3</p>
                      <p className="mt-2 font-semibold">Corrige el vector</p>
                      <p className="mt-1 text-sm text-muted-foreground">Resuelve J(Xk) ΔX = -F(Xk) para obtener X(k+1).</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="label-system" className="text-[12px] font-bold uppercase tracking-widest text-primary/70">
                  Etiqueta del registro
                </Label>
                <Input
                  id="label-system"
                  value={historyLabel}
                  onChange={(event) => setHistoryLabel(event.target.value)}
                  placeholder="Ej: sistema 5x5"
                  className="h-12 border-primary/20 bg-background/50"
                />
              </div>

              <Button onClick={handleCalculate} className="w-full bg-primary py-8 text-xl font-bold text-primary-foreground shadow-xl transition-transform hover:scale-[1.01] hover:bg-primary/85">
                Calcular Sistema {dimension}x{dimension}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-card/55 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-primary">Vista inicial del sistema</CardTitle>
              <CardDescription>Equivale a la zona de entrada del archivo de referencia, integrada a nuestro layout.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-primary/10 bg-background/30 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Vector inicial</p>
                  <p className="mt-3 font-mono text-sm">X0 = ({initialValues.join(', ')})</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-background/30 p-4">
                  <div className="flex items-center gap-2">
                    <FunctionSquare className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">Sistema</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {functions.map((fn, index) => (
                      <p key={index} className="font-mono text-xs break-words [overflow-wrap:anywhere]">
                        F{index + 1} = {fn || 'N/D'}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-primary/10 bg-background/25 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-primary">Formula base</p>
                    <p className="text-xs text-muted-foreground">Actualizacion iterativa para sistemas no lineales.</p>
                  </div>
                  <Badge variant="outline" className="border-primary/20 text-primary/70">n x n</Badge>
                </div>
                <div className="mt-4 rounded-2xl border border-primary/10 bg-slate-950/80 p-4 font-mono text-sm text-slate-100">
                  X(k+1) = X(k) + ΔX
                  <br />
                  J(Xk) · ΔX = -F(Xk)
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-primary/10 bg-background/40 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Dimension</p>
                    <p className="mt-2 text-lg font-bold">{dimension}</p>
                  </div>
                  <div className="rounded-2xl border border-primary/10 bg-background/40 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Tolerancia</p>
                    <p className="mt-2 font-mono text-sm">{tol}</p>
                  </div>
                  <div className="rounded-2xl border border-primary/10 bg-background/40 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Max iter</p>
                    <p className="mt-2 font-mono text-sm">{maxIter}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-primary/10 bg-card/55 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-primary">Jacobiana en el arranque</CardTitle>
              <CardDescription>Matriz visual y derivadas parciales evaluadas con el punto inicial actual.</CardDescription>
            </CardHeader>
            <CardContent>
              {preview ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-3xl border border-primary/10 bg-slate-950/80 p-4">
                    <div className="grid min-w-max gap-2" style={{ gridTemplateColumns: `120px repeat(${variables.length}, minmax(128px, 1fr))` }}>
                      <div className="rounded-xl border border-primary/10 bg-primary/10 p-3 text-center text-xs font-bold uppercase tracking-widest text-primary/70">
                        J(X0)
                      </div>
                      {variables.map((variable) => (
                        <div key={variable} className="rounded-xl border border-primary/10 bg-primary/10 p-3 text-center text-xs font-bold uppercase tracking-widest text-primary/70">
                          d/d{variable}
                        </div>
                      ))}
                      {preview.derivatives.map((row, rowIndex) => (
                        <div key={`row-${rowIndex}`} className="contents">
                          <div className="rounded-xl border border-primary/10 bg-white/5 p-3 text-center font-mono text-xs text-slate-200">
                            F{rowIndex + 1}
                          </div>
                          {row.map((expression, colIndex) => (
                            <div key={`${rowIndex}-${colIndex}`} className="rounded-xl border border-primary/10 bg-white/5 p-3">
                              <p className="font-mono text-[11px] text-slate-100 break-words [overflow-wrap:anywhere]">
                                {expression}
                              </p>
                              <p className="mt-2 font-mono text-[11px] text-primary">
                                {formatNumber(preview.jacobian[rowIndex][colIndex])}
                              </p>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {preview.fValues.map((value, index) => (
                      <div key={index} className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">F{index + 1}(X0)</p>
                        <p className="mt-2 font-mono text-sm text-primary">{formatNumber(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-primary/15 bg-background/30 p-4 text-sm text-muted-foreground">
                  Ajusta ecuaciones y valores iniciales para mostrar la Jacobiana.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-card/55 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <LineChart className="h-4 w-4 text-primary" />
                  <div>
                    <CardTitle className="text-lg text-primary">Grafica de iteracion</CardTitle>
                    <CardDescription>Proyeccion sobre las dos primeras variables.</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => zoomSystemGraph('in')} title="Acercar grafica" aria-label="Acercar grafica">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => zoomSystemGraph('out')} title="Alejar grafica" aria-label="Alejar grafica">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setGraphZoom(1)} title="Restablecer vista" aria-label="Restablecer vista">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {systemGraph ? (
                <GeoGebraGraph
                  expressions={[]}
                  commands={systemGraph.commands}
                  points={systemGraph.points}
                  xMin={systemGraph.xMin}
                  xMax={systemGraph.xMax}
                  yMin={systemGraph.yMin}
                  yMax={systemGraph.yMax}
                  heightClassName="h-[28rem] lg:h-[36rem]"
                  showAlgebraInput={false}
                  fallback={
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                      Cargando proyeccion del sistema en GeoGebra...
                    </div>
                  }
                />
              ) : (
                <div className="flex min-h-[28rem] items-center justify-center rounded-2xl border border-primary/20 bg-black px-6 text-center text-sm text-muted-foreground lg:min-h-[36rem]">
                  Calcula el sistema para ver la proyeccion en las dos primeras variables.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {result && (
        <>
          <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-primary">Resultado del sistema</CardTitle>
                  <CardDescription>Resumen de convergencia, solucion aproximada y lectura rapida del proceso.</CardDescription>
                </div>
                <Badge variant={result.converged ? 'default' : 'destructive'} className="bg-primary px-3 py-1 text-sm text-primary-foreground">
                  {result.converged ? 'Convergente' : 'No convergente'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl border border-primary/10 bg-background/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Iteraciones</p>
                  <p className="mt-2 text-2xl font-black text-primary">{result.iterations.length}</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-background/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Error final</p>
                  <p className="mt-2 font-mono text-sm text-secondary">{result.error !== null ? result.error.toExponential(4) : 'N/A'}</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-background/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">||F|| final</p>
                  <p className="mt-2 font-mono text-sm text-primary">{finalResidual !== null ? finalResidual.toExponential(4) : 'N/A'}</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-background/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Convergencia</p>
                  <p className="mt-2 text-sm font-semibold">{convergenceLabel}</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-background/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Estado</p>
                  <div className="mt-2 flex items-center gap-2">
                    {result.converged ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <AlertCircle className="h-5 w-5 text-destructive" />}
                    <span className="text-xs font-medium leading-tight">{result.message}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-3xl border border-primary/10 bg-background/30 p-5">
                  <div className="flex items-center gap-2">
                    <Sigma className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-primary">Solucion aproximada</p>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {result.variables.map((variable, index) => (
                      <div key={variable} className="rounded-2xl border border-primary/10 bg-background/50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{variable}*</p>
                        <p className="mt-2 font-mono text-lg font-bold text-primary">
                          {solution[index] !== undefined ? formatNumber(solution[index]) : 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <ConvergenceChart
                  iterations={result.iterations.map((iteration) => ({
                    iteration: iteration.iteration,
                    ea: iteration.ea,
                  }))}
                  className="h-full"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-primary">Tabla de iteraciones</CardTitle>
                <CardDescription>Vista resumida del proceso con norma residual y correccion por paso.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[540px] rounded-xl border border-primary/10 bg-background/30">
                  <Table className="min-w-[860px]">
                    <TableHeader className="sticky top-0 z-10 border-b border-primary/20 bg-white/95 backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="uppercase text-[10px] font-bold tracking-widest text-primary/70">Iter</TableHead>
                        <TableHead className="uppercase text-[10px] font-bold tracking-widest text-primary/70">X(k)</TableHead>
                        <TableHead className="uppercase text-[10px] font-bold tracking-widest text-primary/70">||F(Xk)||</TableHead>
                        <TableHead className="uppercase text-[10px] font-bold tracking-widest text-primary/70">||ΔX||∞</TableHead>
                        <TableHead className="uppercase text-[10px] font-bold tracking-widest text-primary/70">Error Relativo</TableHead>
                        <TableHead className="uppercase text-[10px] font-bold tracking-widest text-primary/70">X(k+1)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {iterationSummary.map((iteration) => (
                        <TableRow key={iteration.iteration} className="transition-colors hover:bg-primary/5">
                          <TableCell className="py-3 font-mono text-xs">{iteration.iteration}</TableCell>
                          <TableCell className="py-3 font-mono text-xs break-words [overflow-wrap:anywhere]">
                            [{iteration.vector.map(formatNumber).join(', ')}]
                          </TableCell>
                          <TableCell className="py-3 font-mono text-xs">
                            {iteration.residual !== null ? iteration.residual.toExponential(4) : 'N/A'}
                          </TableCell>
                          <TableCell className="py-3 font-mono text-xs">{iteration.ea.toExponential(4)}</TableCell>
                          <TableCell className="py-3 font-mono text-xs">{iteration.er}</TableCell>
                          <TableCell className="py-3 font-mono text-xs break-words [overflow-wrap:anywhere]">
                            [{iteration.nextVector.map(formatNumber).join(', ')}]
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-primary">Detalle por iteracion</CardTitle>
                <CardDescription>Bloques expandibles inspirados en la vista detallada del archivo HTML.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[540px] pr-4">
                  <div className="space-y-3">
                    {iterationSummary.map((iteration, index) => {
                      const isOpen = expandedIteration === index;

                      return (
                        <div key={iteration.iteration} className="rounded-3xl border border-primary/10 bg-background/30">
                          <button
                            type="button"
                            onClick={() => setExpandedIteration(isOpen ? null : index)}
                            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                          >
                            <div>
                              <p className="text-sm font-semibold text-primary">Iteracion {iteration.iteration}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                ||F|| = {iteration.residual !== null ? iteration.residual.toExponential(4) : 'N/A'} · ||ΔX||∞ = {iteration.ea.toExponential(4)}
                              </p>
                            </div>
                            <ChevronRight className={cn('h-4 w-4 text-primary transition-transform', isOpen && 'rotate-90')} />
                          </button>

                          {isOpen && (
                            <div className="space-y-4 border-t border-primary/10 px-5 py-4">
                              <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl border border-primary/10 bg-background/50 p-4">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">X(k)</p>
                                  <p className="mt-2 font-mono text-xs break-words [overflow-wrap:anywhere]">
                                    [{iteration.vector.map(formatNumber).join(', ')}]
                                  </p>
                                </div>
                                <div className="rounded-2xl border border-primary/10 bg-background/50 p-4">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">F(Xk)</p>
                                  <p className="mt-2 font-mono text-xs break-words [overflow-wrap:anywhere]">
                                    [{iteration.fValues.map(formatNumber).join(', ')}]
                                  </p>
                                </div>
                                <div className="rounded-2xl border border-primary/10 bg-background/50 p-4">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">ΔX</p>
                                  <p className="mt-2 font-mono text-xs break-words [overflow-wrap:anywhere]">
                                    [{iteration.delta.map(formatNumber).join(', ')}]
                                  </p>
                                </div>
                              </div>

                              <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-slate-950/85 p-4">
                                <div className="grid min-w-max gap-2" style={{ gridTemplateColumns: `76px repeat(${variables.length}, minmax(104px, 1fr))` }}>
                                  <div className="rounded-xl border border-primary/10 bg-primary/10 p-2 text-center text-[10px] font-bold uppercase tracking-widest text-primary/70">
                                    J
                                  </div>
                                  {variables.map((variable) => (
                                    <div key={`${iteration.iteration}-${variable}`} className="rounded-xl border border-primary/10 bg-primary/10 p-2 text-center text-[10px] font-bold uppercase tracking-widest text-primary/70">
                                      d/d{variable}
                                    </div>
                                  ))}
                                  {iteration.jacobian.map((row, rowIndex) => (
                                    <div key={`${iteration.iteration}-row-${rowIndex}`} className="contents">
                                      <div className="rounded-xl border border-primary/10 bg-white/5 p-2 text-center font-mono text-[11px] text-slate-200">
                                        F{rowIndex + 1}
                                      </div>
                                      {row.map((value, colIndex) => (
                                        <div key={`${iteration.iteration}-${rowIndex}-${colIndex}`} className="rounded-xl border border-primary/10 bg-white/5 p-2 text-center font-mono text-[11px] text-primary">
                                          {formatNumber(value)}
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="rounded-2xl border border-primary/10 bg-background/50 p-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">X(k+1)</p>
                                <p className="mt-2 font-mono text-xs break-words [overflow-wrap:anywhere]">
                                  [{iteration.nextVector.map(formatNumber).join(', ')}]
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-primary">Historial del sistema</CardTitle>
                <CardDescription>Ultimos calculos guardados localmente en este navegador.</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportHistory} className="border-primary/20 hover:bg-primary/10">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearHistory} className="border-primary/20 hover:bg-primary/10">
                Limpiar historial
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary/15 bg-background/30 p-4 text-sm text-muted-foreground">
              Todavia no hay ejecuciones del sistema almacenadas.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="grid w-full gap-3 rounded-2xl border border-primary/10 bg-background/35 p-4 text-left transition-all hover:border-primary/30 hover:bg-primary/5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-primary/60">{new Date(item.timestamp).toLocaleString()}</p>
                      {editingId === item.id ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Input value={editingValue} onChange={(event) => setEditingValue(event.target.value)} className="h-9 w-[220px] border-primary/20 bg-background/50" placeholder="Etiqueta del registro" />
                          <Button
                            size="sm"
                            onClick={() => {
                              setHistory((current) => current.map((entry) => (entry.id === item.id ? { ...entry, label: editingValue.trim() } : entry)));
                              setEditingId(null);
                              setEditingValue('');
                            }}
                          >
                            Guardar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditingValue(''); }}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="mt-1 text-sm font-semibold">{item.label?.trim() || `Sistema ${item.variables?.length ?? 2}x${item.variables?.length ?? 2}`}</p>
                          <p className="mt-1 text-xs text-muted-foreground">X0 = ({(item.params.initialValues ?? [item.params.x0, item.params.y0]).join(', ')})</p>
                        </>
                      )}
                    </div>
                    <Badge variant={item.converged ? 'default' : 'secondary'} className={item.converged ? 'bg-primary text-primary-foreground' : ''}>
                      {item.converged ? 'Convergente' : 'Sin convergencia'}
                    </Badge>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {(item.functions ?? [item.functionF1, item.functionF2]).map((fn, index) => (
                      <p key={index} className="font-mono text-xs break-words [overflow-wrap:anywhere]">F{index + 1} = {fn}</p>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Solucion: {solutionValues(item).length ? `(${solutionValues(item).map(formatNumber).join(', ')})` : 'N/D'} · Iteraciones: {item.iterations.length}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => loadCalculation(item)}>Cargar</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(item.id); setEditingValue(item.label ?? ''); }} className="border-primary/20 hover:bg-primary/10">
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setHistory((current) => current.filter((entry) => entry.id !== item.id));
                        toast.success('Registro eliminado');
                      }}
                      className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

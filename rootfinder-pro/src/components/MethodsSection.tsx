import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MethodType, CalculationResult, FixedPointCandidate } from '@/types';
import { NumericalMethods } from '@/lib/numericalMethods';
import { MathEvaluator } from '@/lib/mathEvaluator';
import { toast } from 'sonner';
import { RefreshCcw, Sparkles, PenSquare, Sigma, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MethodsSectionProps {
  f: string;
  a: string;
  b: string;
  method: MethodType;
  setMethod: (m: MethodType) => void;
  tol: string;
  setTol: (t: string) => void;
  maxIter: string;
  setMaxIter: (m: string) => void;
  x0: string;
  setX0: (x: string) => void;
  x1: string;
  setX1: (x: string) => void;
  gx: string;
  setGx: (g: string) => void;
  g1: string;
  setG1: (g: string) => void;
  onResult: (result: CalculationResult) => void;
}

type FixedPointMode = 'automatic' | 'manual';
type RichardsonFormula = 'central' | 'forward' | 'backward';

export function MethodsSection({
  f, a, b,
  method, setMethod,
  tol, setTol,
  maxIter, setMaxIter,
  x0, setX0,
  x1, setX1,
  gx, setGx,
  g1, setG1,
  onResult
}: MethodsSectionProps) {
  const [fixedPointMode, setFixedPointMode] = useState<FixedPointMode>('automatic');
  const [manualCandidatesText, setManualCandidatesText] = useState('');
  const [selectedManualExpression, setSelectedManualExpression] = useState('');
  const [selectedAutoExpression, setSelectedAutoExpression] = useState('');
  const [richardsonH, setRichardsonH] = useState('0.5');
  const [richardsonLevels, setRichardsonLevels] = useState('5');
  const [richardsonDerivative, setRichardsonDerivative] = useState<'1' | '2'>('1');
  const [richardsonFormula, setRichardsonFormula] = useState<RichardsonFormula>('central');

  const parsedA = a.trim() === '' ? NaN : parseFloat(a);
  const parsedB = b.trim() === '' ? NaN : parseFloat(b);
  const parsedX0 = x0.trim() === '' ? NaN : parseFloat(x0);
  const parsedG1 = g1.trim() === '' ? NaN : parseFloat(g1);
  const fixedPointProbe = !Number.isNaN(parsedG1) ? parsedG1 : parsedX0;
  const hasValidFixedPointBase = method === 'fixed-point' && f.trim() && MathEvaluator.isValid(f) && !Number.isNaN(fixedPointProbe);

  const automaticPreview = useMemo(
    () => {
      if (!hasValidFixedPointBase) return { selected: null, candidates: [] as FixedPointCandidate[] };
      
      const candidates = NumericalMethods.generateFixedPointCandidates(
        f,
        fixedPointProbe,
        !Number.isNaN(parsedA) && !Number.isNaN(parsedB) ? { a: parsedA, b: parsedB } : undefined
      );

      // Try to find the expression explicitly selected by the user
      const explicit = candidates.find(c => c.expression === selectedAutoExpression);
      if (explicit) return { selected: explicit, candidates };

      // Fallback to the first convergent one
      const fallback = candidates.find(c => c.convergent) ?? candidates[0] ?? null;
      return { selected: fallback, candidates };
    },
    [hasValidFixedPointBase, f, fixedPointProbe, parsedA, parsedB, selectedAutoExpression]
  );

  const manualExpressions = useMemo(
    () => manualCandidatesText
      .split(/\r?\n|;/)
      .map((entry) => entry.trim())
      .filter(Boolean),
    [manualCandidatesText]
  );

  const manualCandidates = useMemo(() => {
    if (!hasValidFixedPointBase) return [] as FixedPointCandidate[];

    return manualExpressions.map((expression) => {
      try {
        const derivativeValue = Math.abs(MathEvaluator.derivative(expression, fixedPointProbe));
        MathEvaluator.evaluate(expression, fixedPointProbe);
        return {
          expression,
          lambda: Number.NaN,
          derivativeAtPoint: derivativeValue,
          convergent: derivativeValue < 1,
          reason: derivativeValue < 1
            ? `|g'(x)| = ${derivativeValue.toFixed(6)} < 1`
            : `|g'(x)| = ${derivativeValue.toFixed(6)} >= 1`,
        };
      } catch (error: any) {
        return {
          expression,
          lambda: Number.NaN,
          derivativeAtPoint: null,
          convergent: false,
          reason: error?.message ? `Inválida: ${error.message}` : 'No se pudo evaluar',
        };
      }
    });
  }, [hasValidFixedPointBase, manualExpressions, fixedPointProbe]);

  const selectedManualCandidate = useMemo(() => {
    if (manualCandidates.length === 0) return null;

    const explicit = manualCandidates.find((candidate) => candidate.expression === selectedManualExpression);
    if (explicit) return explicit;

    return manualCandidates.find((candidate) => candidate.convergent) ?? manualCandidates[0];
  }, [manualCandidates, selectedManualExpression]);

  const activeFixedPointSelection = fixedPointMode === 'manual' ? selectedManualCandidate : automaticPreview.selected;

  useEffect(() => {
    if (method !== 'fixed-point') return;
    setGx(activeFixedPointSelection?.expression ?? '');
  }, [method, activeFixedPointSelection?.expression, setGx]);

  useEffect(() => {
    if (method !== 'fixed-point') return;
    if (!gx.trim()) return;

    setManualCandidatesText((current) => {
      if (current.includes(gx)) return current;
      return current.trim() ? `${current}\n${gx}` : gx;
    });
  }, [method, gx]);

  useEffect(() => {
    if (selectedManualCandidate?.expression) {
      setSelectedManualExpression(selectedManualCandidate.expression);
    }
  }, [selectedManualCandidate?.expression]);

  const handleSync = () => {
    setX0(a || '0');
    setX1(b || '1');
    setG1(a || '0');
    toast.info('Valores sincronizados con la verificación');
  };

  const handleCalculate = () => {
    if (!f.trim()) return toast.error('Ingresa una función f(x) en la pestaña de verificación');
    if (!MathEvaluator.isValid(f)) return toast.error('La función f(x) en la pestaña de verificación es inválida');

    const t = parseFloat(tol);
    const m = parseInt(maxIter);
<<<<<<< Updated upstream
    const valA = parseFloat(a);
    const valB = parseFloat(b);
    const valX0 = parseFloat(x0);
    const valX1 = parseFloat(x1);
    const valG1 = parseFloat(g1);
=======
    const valA = parseNumericInput(a);
    const valB = parseNumericInput(b);
    const valX0 = parseNumericInput(x0);
    const valX1 = parseNumericInput(x1);
    const valG1 = parseNumericInput(g1);
    const valRichardsonH = parseNumericInput(richardsonH);
    const valRichardsonLevels = parseInt(richardsonLevels);
>>>>>>> Stashed changes

    if (isNaN(t) || t <= 0) return toast.error('La tolerancia debe ser un número positivo');
    if (isNaN(m) || m <= 0) return toast.error('El número máximo de iteraciones debe ser un entero positivo');

    let result: CalculationResult;

    try {
      switch (method) {
        case 'bisection':
          if (isNaN(valA) || isNaN(valB)) return toast.error('Límites A y B inválidos');
          result = NumericalMethods.bisection(f, valA, valB, t, m);
          break;
        case 'false-position':
          if (isNaN(valA) || isNaN(valB)) return toast.error('Límites A y B inválidos');
          result = NumericalMethods.falsePosition(f, valA, valB, t, m);
          break;
        case 'newton-raphson':
          if (isNaN(valX0)) return toast.error('Punto inicial x0 inválido');
          result = NumericalMethods.newtonRaphson(f, valX0, t, m);
          break;
        case 'secant':
          if (isNaN(valX0) || isNaN(valX1)) return toast.error('Puntos x0 y x1 inválidos');
          result = NumericalMethods.secant(f, valX0, valX1, t, m);
          break;
        case 'fixed-point':
          if (isNaN(valX0)) return toast.error('Punto inicial x0 inválido');

          if (!activeFixedPointSelection) return toast.error('Selecciona o ingresa una transformada g(x)');
          
          if (!activeFixedPointSelection.convergent) {
            toast.warning('La transformada seleccionada no cumple el criterio de convergencia (|g\'(x)| < 1). El método podría divergir.');
          }

          result = NumericalMethods.fixedPointWithTransformation(
            f,
            activeFixedPointSelection.expression,
            valX0,
            t,
            m,
            isNaN(valG1) ? undefined : valG1,
            fixedPointMode === 'automatic' ? automaticPreview.candidates : manualCandidates,
            activeFixedPointSelection.derivativeAtPoint
          );
          break;
        case 'richardson':
          if (isNaN(valX0)) return toast.error('Punto x0 invalido');
          if (isNaN(valRichardsonH) || valRichardsonH <= 0) return toast.error('El paso h inicial debe ser positivo');
          if (isNaN(valRichardsonLevels) || valRichardsonLevels <= 0) return toast.error('Los niveles deben ser un entero positivo');

          result = NumericalMethods.richardson(
            f,
            valX0,
            valRichardsonH,
            valRichardsonLevels,
            richardsonDerivative === '1' ? 1 : 2,
            richardsonFormula,
            t
          );
          break;
        case 'romberg':
          if (isNaN(valA) || isNaN(valB)) return toast.error('Limites A y B invalidos');
          result = NumericalMethods.romberg(f, valA, valB, t, m);
          break;
        default:
          return;
      }

      onResult(result);
      if (result.converged) {
        toast.success('Cálculo completado con éxito');
      } else {
        toast.warning(result.message);
      }
    } catch (e: any) {
      toast.error('Error matemático: ' + e.message);
    }
  };

  const methodLabels: Record<MethodType, string> = {
    'bisection': 'Bisección (Cerrado)',
    'false-position': 'Regla Falsa (Cerrado)',
    'newton-raphson': 'Newton-Raphson (Abierto)',
    'secant': 'Secante (Abierto)',
    'fixed-point': 'Punto Fijo (Abierto)',
    'richardson': 'Extrapolacion de Richardson',
    'romberg': 'Integracion de Romberg'
  };

  const methodHints: Record<MethodType, string> = {
    'bisection': 'Intervalo con cambio de signo y convergencia segura.',
    'false-position': 'Acelera métodos cerrados usando interpolación lineal.',
    'newton-raphson': 'Muy rápido si el punto inicial es bueno y f\'(x) no se anula.',
    'secant': 'Evita derivadas explícitas usando dos aproximaciones iniciales.',
    'fixed-point': 'Requiere una transformación g(x) con |g\'(x)| < 1 cerca de la raíz.',
    'richardson': 'Refina diferencias finitas reduciendo h y cancelando el error dominante.',
    'romberg': 'Integra con trapecios compuestos y una matriz triangular de extrapolacion.',
  };

  const renderCandidateCard = (candidate: FixedPointCandidate, selected: boolean, mode: 'automatic' | 'manual') => (
    <button
      key={`${mode}-${candidate.expression}`}
      type="button"
      onClick={() => {
        if (mode === 'manual') {
          setSelectedManualExpression(candidate.expression);
        } else {
          setSelectedAutoExpression(candidate.expression);
        }
      }}
      className={cn(
        'w-full rounded-2xl border p-4 text-left transition-all',
        selected
          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
          : 'border-primary/10 bg-background/30 hover:border-primary/30 hover:bg-primary/5'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge
          variant={candidate.convergent ? 'default' : 'secondary'}
          className={candidate.convergent ? 'bg-primary text-primary-foreground' : 'bg-secondary/20 text-secondary'}
        >
          {candidate.convergent ? 'Convergente' : 'No convergente'}
        </Badge>
        {mode === 'automatic' && Number.isFinite(candidate.lambda) && (
          <span className="text-xs text-muted-foreground break-all">λ = {candidate.lambda}</span>
        )}
        {selected && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Usada</span>
        )}
      </div>
      <p className="mt-3 font-mono text-xs sm:text-sm break-words [overflow-wrap:anywhere]">{candidate.expression}</p>
      <p className="mt-2 text-xs text-muted-foreground">{candidate.reason}</p>
    </button>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="border-primary/10 bg-card/60 backdrop-blur-sm shadow-2xl">
          <CardHeader className="border-b border-primary/10 bg-linear-to-r from-primary/10 via-transparent to-transparent">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-3xl font-black tracking-tight text-primary">Centro de Resolución</CardTitle>
                <CardDescription className="text-base max-w-2xl">
                  Configura el método, define los parámetros numéricos y valida el comportamiento antes de ejecutar el cálculo.
                </CardDescription>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-background/40 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/70">Método activo</p>
                <p className="mt-1 text-lg font-bold">{methodLabels[method]}</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs">{methodHints[method]}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8 p-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="space-y-6">
                <div className="grid gap-3">
                  <Label className="text-primary/70 font-bold uppercase text-[12px] tracking-widest">Método Numérico</Label>
                  <Select value={method} onValueChange={(v) => setMethod(v as MethodType)}>
                    <SelectTrigger className="h-12 bg-background/50 border-primary/20 focus:ring-primary text-lg">
                      <SelectValue placeholder="Selecciona un método" value={methodLabels[method]} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bisection">Bisección (Cerrado)</SelectItem>
                      <SelectItem value="false-position">Regla Falsa (Cerrado)</SelectItem>
                      <SelectItem value="newton-raphson">Newton-Raphson (Abierto)</SelectItem>
                      <SelectItem value="secant">Secante (Abierto)</SelectItem>
                      <SelectItem value="fixed-point">Punto Fijo (Abierto)</SelectItem>
                      <SelectItem value="richardson">Extrapolacion de Richardson</SelectItem>
                      <SelectItem value="romberg">Integracion de Romberg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-3">
                    <Label htmlFor="tol" className="text-primary/70 font-bold uppercase text-[12px] tracking-widest">Tolerancia (ε)</Label>
                    <Input
                      id="tol"
                      type="number"
                      step="any"
                      placeholder="Ej: 0.0001"
                      value={tol}
                      onChange={(e) => setTol(e.target.value)}
                      className="h-12 bg-background/50 border-primary/20 text-lg"
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="maxIter" className="text-primary/70 font-bold uppercase text-[12px] tracking-widest">
                      {method === 'romberg' ? 'Niveles máximos' : 'Iteraciones Máx'}
                    </Label>
                    <Input
                      id="maxIter"
                      type="number"
                      placeholder="Ej: 100"
                      value={maxIter}
                      onChange={(e) => setMaxIter(e.target.value)}
                      className="h-12 bg-background/50 border-primary/20 text-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {(method === 'newton-raphson' || method === 'secant' || method === 'fixed-point' || method === 'richardson') ? (
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="x0" className="text-primary/70 font-bold uppercase text-[12px] tracking-widest">
                        {method === 'richardson' ? 'x0 (Punto de derivada)' : method === 'secant' ? 'x0 (Inicial)' : 'x0 (Punto Inicial)'}
                      </Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary/50 hover:text-primary"
                        onClick={handleSync}
                        title="Sincronizar con intervalo a/b"
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      id="x0"
                      type="number"
                      step="any"
                      value={x0}
                      onChange={(e) => setX0(e.target.value)}
                      className="h-12 bg-background/50 border-primary/20 text-lg"
                    />
                  </div>
                ) : (
                  <div className="rounded-3xl border border-primary/10 bg-primary/5 p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/60">Entrada heredada</p>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Este método usa directamente el intervalo definido en verificación:
                      <span className="ml-2 inline-flex items-center gap-2 rounded-full border border-primary/20 px-3 py-1 font-mono text-primary">
                        a={a} · b={b}
                      </span>
                    </p>
                  </div>
                )}

                {method === 'secant' && (
                  <div className="grid gap-3">
                    <Label htmlFor="x1" className="text-primary/70 font-bold uppercase text-[12px] tracking-widest">x1 (Segundo Punto)</Label>
                    <Input
                      id="x1"
                      type="number"
                      step="any"
                      value={x1}
                      onChange={(e) => setX1(e.target.value)}
                      className="h-12 bg-background/50 border-primary/20 text-lg"
                    />
                  </div>
                )}

                {method === 'richardson' && (
                  <div className="rounded-3xl border border-primary/15 bg-background/35 p-5 space-y-5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/70">Extrapolacion de Richardson</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Reduce el paso h a la mitad y combina aproximaciones para cancelar el error dominante.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-3">
                        <Label htmlFor="richardson-h" className="text-primary/70 font-bold uppercase text-[12px] tracking-widest">Paso h inicial</Label>
                        <Input
                          id="richardson-h"
                          type="number"
                          step="any"
                          value={richardsonH}
                          onChange={(event) => setRichardsonH(event.target.value)}
                          className="h-12 bg-background/50 border-primary/20 text-lg"
                        />
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="richardson-levels" className="text-primary/70 font-bold uppercase text-[12px] tracking-widest">Niveles</Label>
                        <Input
                          id="richardson-levels"
                          type="number"
                          min="1"
                          max="8"
                          value={richardsonLevels}
                          onChange={(event) => setRichardsonLevels(event.target.value)}
                          className="h-12 bg-background/50 border-primary/20 text-lg"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-3">
                        <Label className="text-primary/70 font-bold uppercase text-[12px] tracking-widest">Derivada</Label>
                        <Select value={richardsonDerivative} onValueChange={(value) => setRichardsonDerivative(value as '1' | '2')}>
                          <SelectTrigger className="h-12 bg-background/50 border-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Primera derivada</SelectItem>
                            <SelectItem value="2">Segunda derivada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-3">
                        <Label className="text-primary/70 font-bold uppercase text-[12px] tracking-widest">Formula base</Label>
                        <Select
                          value={richardsonDerivative === '2' ? 'central' : richardsonFormula}
                          onValueChange={(value) => setRichardsonFormula(value as RichardsonFormula)}
                        >
                          <SelectTrigger className="h-12 bg-background/50 border-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="central">Central O(h^2)</SelectItem>
                            <SelectItem value="forward">Hacia adelante O(h)</SelectItem>
                            <SelectItem value="backward">Hacia atras O(h)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/60">Criterio</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        La tolerancia compara diagonales consecutivas de la matriz R y usa la ultima diagonal como resultado.
                      </p>
                    </div>
                  </div>
                )}

                {method === 'romberg' && (
                  <div className="rounded-3xl border border-primary/15 bg-background/35 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/70">Integracion de Romberg</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      La primera columna aplica trapecio compuesto con n = 1, 2, 4, 8... y las columnas siguientes aplican extrapolacion con factor 4^k.
                    </p>
                  </div>
                )}

                {method === 'fixed-point' && (
                  <div className="rounded-3xl border border-primary/15 bg-background/35 p-5 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/70">Laboratorio de Punto Fijo</p>
                        <p className="mt-1 text-sm text-muted-foreground">Compara transformadas automáticas y despejes manuales antes de iterar.</p>
                      </div>
                      <div className="flex rounded-2xl border border-primary/15 bg-muted/40 p-1">
                        <button
                          type="button"
                          onClick={() => setFixedPointMode('automatic')}
                          className={cn(
                            'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                            fixedPointMode === 'automatic' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Sparkles className="h-4 w-4" />
                          Automático
                        </button>
                        <button
                          type="button"
                          onClick={() => setFixedPointMode('manual')}
                          className={cn(
                            'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                            fixedPointMode === 'manual' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <PenSquare className="h-4 w-4" />
                          Manual
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-3">
                        <Label htmlFor="g1" className="text-primary/70 font-bold uppercase text-[12px] tracking-widest">Punto de prueba g1</Label>
                        <Input
                          id="g1"
                          type="number"
                          step="any"
                          placeholder="Si lo dejas vacío, usa x0"
                          value={g1}
                          onChange={(e) => setG1(e.target.value)}
                          className="h-12 bg-background/50 border-primary/20 text-lg"
                        />
                      </div>
                      <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/60">Referencia</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Se evalúa convergencia con
                          <span className="mx-2 font-mono text-primary">{Number.isNaN(fixedPointProbe) ? 'sin definir' : fixedPointProbe}</span>
                          y el criterio `|g'(x)| &lt; 1`.
                        </p>
                      </div>
                    </div>

                    {fixedPointMode === 'manual' && (
                      <div className="space-y-3">
                        <Label htmlFor="manual-gx" className="text-primary/70 font-bold uppercase text-[12px] tracking-widest">Transformadas manuales g(x)</Label>
                        <textarea
                          id="manual-gx"
                          value={manualCandidatesText}
                          onChange={(e) => setManualCandidatesText(e.target.value)}
                          placeholder={'Escribe una transformada por línea.\nEjemplo:\n(2*x + exp(x)) / 3\nsqrt(3*x - exp(x))'}
                          className="min-h-36 w-full rounded-2xl border border-primary/20 bg-background/60 px-4 py-3 font-mono text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <p className="text-xs text-muted-foreground">
                          Puedes pegar varios despejes del cuaderno. El sistema calcula `g(x)`, `|g'(x)|` y te deja elegir el que converge.
                        </p>
                      </div>
                    )}

                    <div className="grid gap-4 2xl:grid-cols-[1.2fr_0.8fr]">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {fixedPointMode === 'automatic' ? <Wand2 className="h-4 w-4 text-primary" /> : <Sigma className="h-4 w-4 text-primary" />}
                          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/70">
                            {fixedPointMode === 'automatic' ? 'Transformadas propuestas' : 'Transformadas manuales evaluadas'}
                          </p>
                        </div>
                        <div className="space-y-3 max-h-[26rem] overflow-y-auto overflow-x-hidden pr-2">
                          {(fixedPointMode === 'automatic' ? automaticPreview.candidates : manualCandidates).length > 0 ? (
                            (fixedPointMode === 'automatic' ? automaticPreview.candidates : manualCandidates)
                              .slice(0, fixedPointMode === 'automatic' ? 8 : 20)
                              .map((candidate) => renderCandidateCard(candidate, activeFixedPointSelection?.expression === candidate.expression, fixedPointMode))
                          ) : (
                            <div className="rounded-2xl border border-dashed border-primary/15 bg-background/30 p-4 text-sm text-muted-foreground">
                              Aún no hay transformadas listas para evaluar con la configuración actual.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/70">Transformación activa</p>
                        <div className="rounded-3xl border border-primary/15 bg-primary/6 p-5 space-y-4 min-h-[16rem] overflow-hidden">
                          {activeFixedPointSelection ? (
                            <>
                              <div className="flex items-center justify-between gap-3">
                                <Badge variant={activeFixedPointSelection.convergent ? 'default' : 'secondary'} className={activeFixedPointSelection.convergent ? 'bg-primary text-primary-foreground' : 'bg-secondary/20 text-secondary'}>
                                  {fixedPointMode === 'automatic' ? 'Automática' : 'Manual'}
                                </Badge>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                                  {activeFixedPointSelection.convergent ? 'Lista para iterar' : 'Revisar criterio'}
                                </span>
                              </div>
                              <p className="font-mono text-sm break-words [overflow-wrap:anywhere]">{activeFixedPointSelection.expression}</p>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl border border-primary/10 bg-background/40 p-3">
                                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">g(x_ref)</p>
                                  <p className="mt-2 font-mono text-sm">
                                    {!Number.isNaN(fixedPointProbe) ? MathEvaluator.evaluate(activeFixedPointSelection.expression, fixedPointProbe).toFixed(6) : 'N/D'}
                                  </p>
                                </div>
                                <div className="rounded-2xl border border-primary/10 bg-background/40 p-3">
                                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">|g'(x_ref)|</p>
                                  <p className={cn('mt-2 font-mono text-sm', activeFixedPointSelection.convergent ? 'text-primary' : 'text-destructive')}>
                                    {(activeFixedPointSelection.derivativeAtPoint ?? Number.NaN).toFixed(6)}
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">{activeFixedPointSelection.reason}</p>
                            </>
                          ) : (
                            <div className="flex h-full min-h-[12rem] items-center justify-center text-center text-sm text-muted-foreground">
                              Define `x0` o `g1` y una función válida para mostrar una candidata activa.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button
              id="calculate-root-button"
              onClick={handleCalculate}
              className="w-full py-8 text-xl font-bold shadow-xl hover:scale-[1.01] transition-transform bg-primary hover:bg-primary/85 text-primary-foreground"
            >
              {method === 'richardson' ? 'Calcular Derivada' : method === 'romberg' ? 'Calcular Integral' : 'Calcular Raíz'}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-primary/10 bg-card/55 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-primary">Resumen del Problema</CardTitle>
              <CardDescription>Contexto rápido de la ecuación y de la zona de trabajo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-primary/10 bg-background/30 p-4">
                <p className="text-[10px] uppercase font-bold tracking-[0.25em] text-primary/60">Ecuación</p>
                <p className="mt-2 font-mono text-sm break-all">{f || 'Sin función'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-primary/10 bg-background/30 p-4">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Intervalo</p>
                  <p className="mt-2 font-mono text-sm">{a} → {b}</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-background/30 p-4">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Inicio</p>
                  <p className="mt-2 font-mono text-sm">x0 = {x0 || 'N/D'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/10 bg-card/55 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-primary">Guía Rápida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>1. Verifica primero si la función es válida y si el intervalo tiene sentido.</p>
              <p>2. Elige el método según el tipo de información disponible.</p>
              <p>3. En Punto Fijo, compara varias `g(x)` y usa la que deje `|g'(x)| &lt; 1`.</p>
              <p>4. Revisa resultados, historial y gráfica como una sola secuencia de validación.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

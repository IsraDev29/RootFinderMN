import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  AlertCircle,
  Calculator,
  ChevronDown,
  FunctionSquare,
  History,
  LineChart,
  Sigma,
  Trash2,
} from 'lucide-react';
import {
  computeCubicSpline,
  computeNumericalDiff,
  CubicSplineResult,
  NumericalDiffResult,
  DiffOrder,
  DiffFormula,
  DIFF_FORMULA_OPTIONS,
  Point,
} from '@/lib/interpolationMethods';
import { MathEvaluator } from '@/lib/mathEvaluator';

// ─────────────────────────────────
// Sub-módulo: Trazadores Cúbicos
// ─────────────────────────────────

function fmt(n: number, digits = 6): string {
  if (!Number.isFinite(n)) return '—';
  return Number(n.toPrecision(digits)).toString();
}

function PointsTable({
  pts,
  onChange,
  onAdd,
  onRemove,
}: {
  pts: Point[];
  onChange: (i: number, field: 'x' | 'y', val: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-semibold text-muted-foreground px-1">
        <span>x</span>
        <span>y</span>
        <span />
      </div>
      {pts.map((p, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <Input
            value={p.x}
            onChange={(e) => onChange(i, 'x', e.target.value)}
            className="h-8 font-mono text-sm"
            placeholder={`x${i}`}
          />
          <Input
            value={p.y}
            onChange={(e) => onChange(i, 'y', e.target.value)}
            className="h-8 font-mono text-sm"
            placeholder={`y${i}`}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
            onClick={() => onRemove(i)}
            disabled={pts.length <= 3}
          >
            ×
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full text-xs" onClick={onAdd}>
        + Agregar punto
      </Button>
    </div>
  );
}

function CubicSplinePanel() {
  const [mode, setMode] = useState<'fx' | 'pts'>('pts');
  const [fxStr, setFxStr] = useState('sin(x)');
  const [pts, setPts] = useState<Point[]>([
    { x: 0, y: 0 },
    { x: 1, y: 0.841 },
    { x: 2, y: 0.909 },
    { x: 3, y: 0.141 },
  ]);
  const [xevalStr, setXevalStr] = useState('1.5');
  const [result, setResult] = useState<CubicSplineResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePtChange = (i: number, field: 'x' | 'y', val: string) => {
    const copy = [...pts];
    copy[i] = { ...copy[i], [field]: val as any };
    setPts(copy);
  };
  const handleAddPt = () => setPts((prev) => [...prev, { x: 0, y: 0 }]);
  const handleRemovePt = (i: number) => setPts((prev) => prev.filter((_, idx) => idx !== i));

  const handleCompute = useCallback(() => {
    setLoading(true);
    try {
      let workPts: Point[];
      let f_str: string | null = null;

      if (mode === 'fx') {
        // Generate nodes automatically from function
        const numNodes = 6;
        const a = -Math.PI, b = Math.PI;
        const step = (b - a) / (numNodes - 1);
        workPts = Array.from({ length: numNodes }, (_, i) => {
          const x = a + i * step;
          const y = MathEvaluator.evaluate(fxStr, x);
          return { x, y };
        });
        f_str = fxStr;
      } else {
        workPts = pts.map((p) => ({
          x: parseFloat(String(p.x)),
          y: parseFloat(String(p.y)),
        }));
        if (workPts.some((p) => isNaN(p.x) || isNaN(p.y))) {
          toast.error('Todos los puntos deben ser números válidos.');
          return;
        }
      }

      const xeval = xevalStr.trim() !== '' ? parseFloat(xevalStr) : null;
      if (xevalStr.trim() !== '' && (xeval === null || isNaN(xeval!))) {
        toast.error('El valor x̂ a evaluar no es un número válido.');
        return;
      }

      const res = computeCubicSpline(workPts, xeval, f_str);
      setResult(res);
      toast.success('Trazadores cúbicos calculados.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al calcular trazadores cúbicos.');
    } finally {
      setLoading(false);
    }
  }, [mode, fxStr, pts, xevalStr]);

  return (
    <div className="space-y-6">
      {/* Selector de modo */}
      <div className="flex gap-0 rounded-xl border border-border overflow-hidden">
        {(['pts', 'fx'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
              mode === m
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {m === 'pts' ? '· Puntos manuales' : 'ƒ(x) Función'}
          </button>
        ))}
      </div>

      {mode === 'pts' ? (
        <div className="space-y-2">
          <Label>Puntos de interpolación</Label>
          <PointsTable
            pts={pts}
            onChange={handlePtChange}
            onAdd={handleAddPt}
            onRemove={handleRemovePt}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Función f(x)</Label>
          <Input
            value={fxStr}
            onChange={(e) => setFxStr(e.target.value)}
            placeholder="ej. sin(x), x^3 - 2*x"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Se generarán 6 nodos automáticamente en [−π, π].
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Valor a evaluar x̂ (opcional)</Label>
        <Input
          value={xevalStr}
          onChange={(e) => setXevalStr(e.target.value)}
          placeholder="ej. 1.5"
          className="font-mono"
        />
      </div>

      <Button className="w-full" onClick={handleCompute} disabled={loading}>
        <Calculator className="mr-2 h-4 w-4" />
        Calcular Trazadores Cúbicos
      </Button>

      {result && <CubicSplineResults result={result} />}
    </div>
  );
}

function CubicSplineResults({ result }: { result: CubicSplineResult }) {
  const { pts, tramos, M, h, xeval, seval, errorInterp } = result;

  return (
    <div className="space-y-4 pt-2">
      {/* Momentos */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sigma className="h-4 w-4 text-primary" />
            Momentos Mᵢ = S''(xᵢ)
          </CardTitle>
          <CardDescription className="text-xs">
            Frontera natural: M₀ = 0, M{pts.length - 1} = 0
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {M.map((m, i) => (
              <Badge
                key={i}
                variant="outline"
                className={`font-mono text-xs ${
                  i === 0 || i === M.length - 1
                    ? 'border-amber-400/50 text-amber-400'
                    : 'border-primary/30'
                }`}
              >
                M<sub>{i}</sub> = {fmt(m)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de tramos */}
      <div>
        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Sigma className="h-4 w-4 text-primary" />
          Tramos del Trazador
        </p>
        <ScrollArea className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Tramo</TableHead>
                <TableHead className="text-xs">[xᵢ, xᵢ₊₁]</TableHead>
                <TableHead className="text-xs">hᵢ</TableHead>
                <TableHead className="text-xs">aᵢ</TableHead>
                <TableHead className="text-xs">bᵢ</TableHead>
                <TableHead className="text-xs">cᵢ</TableHead>
                <TableHead className="text-xs">dᵢ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tramos.map((t, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs text-primary font-bold">S{i}</TableCell>
                  <TableCell className="font-mono text-xs">
                    [{fmt(t.a, 4)}, {fmt(t.b, 4)}]
                  </TableCell>
                  <TableCell className="font-mono text-xs">{fmt(t.hi, 4)}</TableCell>
                  <TableCell className="font-mono text-xs">{fmt(t.a_coef)}</TableCell>
                  <TableCell className="font-mono text-xs">{fmt(t.b_coef)}</TableCell>
                  <TableCell className="font-mono text-xs">{fmt(t.c_coef)}</TableCell>
                  <TableCell className="font-mono text-xs">{fmt(t.d_coef)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Resultado de evaluación */}
      {xeval !== null && seval !== null && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
                S(x̂) evaluación
              </p>
              <p className="font-mono text-2xl font-bold text-primary">
                S({fmt(xeval, 4)}) = {fmt(seval)}
              </p>
            </CardContent>
          </Card>
          {errorInterp !== null && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="pt-4 pb-3 px-4">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
                  Error de interpolación |f(x̂) − S(x̂)|
                </p>
                <p className="font-mono text-2xl font-bold text-destructive">
                  {fmt(errorInterp)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Paso a paso */}
      <details className="group rounded-xl border border-border">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold flex items-center gap-2 select-none">
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-90 text-primary" />
          Desarrollo paso a paso
        </summary>
        <div className="px-4 pb-4 space-y-4 text-sm">
          {/* Paso 1 – nodos */}
          <div>
            <p className="font-semibold text-xs uppercase tracking-wide text-primary mb-2">
              Paso 1 — Nodos e intervalos hᵢ
            </p>
            <div className="flex flex-wrap gap-2">
              {pts.map((p, i) => (
                <Badge key={i} variant="outline" className="font-mono text-xs">
                  ({fmt(p.x, 4)}, {fmt(p.y, 4)})
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {h.map((hi, i) => (
                <Badge key={i} variant="secondary" className="font-mono text-xs">
                  h{i} = {fmt(hi, 4)}
                </Badge>
              ))}
            </div>
          </div>
          {/* Paso 2 – sistema */}
          <div>
            <p className="font-semibold text-xs uppercase tracking-wide text-primary mb-2">
              Paso 2 — Sistema tridiagonal (Algoritmo de Thomas)
            </p>
            <p className="text-xs text-muted-foreground">
              Para cada nodo interior i: hᵢ₋₁·Mᵢ₋₁ + 2(hᵢ₋₁+hᵢ)·Mᵢ + hᵢ·Mᵢ₊₁ = 6·[(yᵢ₊₁−yᵢ)/hᵢ − (yᵢ−yᵢ₋₁)/hᵢ₋₁]
            </p>
          </div>
          {/* Paso 3 – coeficientes */}
          <div>
            <p className="font-semibold text-xs uppercase tracking-wide text-primary mb-2">
              Paso 3 — Coeficientes de cada tramo Sᵢ(x)
            </p>
            <p className="text-xs text-muted-foreground mb-2">
              Sᵢ(x) = aᵢ·(xᵢ₊₁−x)³ + bᵢ·(x−xᵢ)³ + cᵢ·(xᵢ₊₁−x) + dᵢ·(x−xᵢ)
            </p>
            {tramos.map((t, i) => (
              <div
                key={i}
                className="mb-2 border-l-2 border-primary/40 pl-3 font-mono text-xs text-muted-foreground"
              >
                <span className="text-primary font-bold">S{i}(x)</span> en [{fmt(t.a, 4)}, {fmt(t.b, 4)}] :
                <br />
                aᵢ = Mᵢ/6hᵢ = {fmt(t.a_coef)} · bᵢ = Mᵢ₊₁/6hᵢ = {fmt(t.b_coef)}
                <br />
                cᵢ = yᵢ/hᵢ − Mᵢ·hᵢ/6 = {fmt(t.c_coef)} · dᵢ = yᵢ₊₁/hᵢ − Mᵢ₊₁·hᵢ/6 = {fmt(t.d_coef)}
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}

// ─────────────────────────────────
// Sub-módulo: Diferenciación Numérica
// ─────────────────────────────────

function NumericalDiffPanel() {
  const [mode, setMode] = useState<'fx' | 'pts'>('fx');
  const [fxStr, setFxStr] = useState('x^3 * sin(x)');
  const [pts, setPts] = useState<Point[]>([
    { x: 0, y: 0 },
    { x: 0.5, y: 0.06 },
    { x: 1.0, y: 0.841 },
    { x: 1.5, y: 1.496 },
    { x: 2.0, y: 0.727 },
  ]);
  const [x0Str, setX0Str] = useState('1');
  const [hStr, setHStr] = useState('0.1');
  const [order, setOrder] = useState<DiffOrder>('1');
  const [formula, setFormula] = useState<DiffFormula>('central');
  const [result, setResult] = useState<NumericalDiffResult | null>(null);
  const [loading, setLoading] = useState(false);

  const formulaOptions = useMemo(() => DIFF_FORMULA_OPTIONS[order], [order]);

  const handlePtChange = (i: number, field: 'x' | 'y', val: string) => {
    const copy = [...pts];
    copy[i] = { ...copy[i], [field]: val as any };
    setPts(copy);
  };
  const handleAddPt = () => setPts((prev) => [...prev, { x: 0, y: 0 }]);
  const handleRemovePt = (i: number) => setPts((prev) => prev.filter((_, idx) => idx !== i));

  const handleCompute = useCallback(() => {
    setLoading(true);
    try {
      const x0 = parseFloat(x0Str);
      const h = parseFloat(hStr);
      if (isNaN(x0)) { toast.error('x₀ debe ser un número válido.'); return; }
      if (isNaN(h) || h <= 0) { toast.error('h debe ser un número positivo.'); return; }

      let workPts: Point[] | null = null;
      let workFx: string | null = null;

      if (mode === 'fx') {
        workFx = fxStr.trim();
        if (!workFx) { toast.error('Ingrese la función f(x).'); return; }
      } else {
        workPts = pts.map((p) => ({
          x: parseFloat(String(p.x)),
          y: parseFloat(String(p.y)),
        }));
        if (workPts.some((p) => isNaN(p.x) || isNaN(p.y))) {
          toast.error('Todos los puntos deben ser números válidos.');
          return;
        }
        if (workPts.length < 3) { toast.error('Se requieren al menos 3 puntos.'); return; }
      }

      const res = computeNumericalDiff(workFx, workPts, x0, h, order, formula);
      setResult(res);
      toast.success('Diferenciación numérica completada.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al calcular la derivada.');
    } finally {
      setLoading(false);
    }
  }, [mode, fxStr, pts, x0Str, hStr, order, formula]);

  return (
    <div className="space-y-6">
      {/* Modo */}
      <div className="flex gap-0 rounded-xl border border-border overflow-hidden">
        {(['fx', 'pts'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
              mode === m
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {m === 'fx' ? 'ƒ(x) Función' : '· Puntos manuales'}
          </button>
        ))}
      </div>

      {mode === 'fx' ? (
        <div className="space-y-2">
          <Label>Función f(x)</Label>
          <Input
            value={fxStr}
            onChange={(e) => setFxStr(e.target.value)}
            placeholder="ej. sin(x), x^2 * exp(x)"
            className="font-mono"
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Puntos tabulados</Label>
          <PointsTable
            pts={pts}
            onChange={handlePtChange}
            onAdd={handleAddPt}
            onRemove={handleRemovePt}
          />
          <p className="text-xs text-muted-foreground">
            Se usará interpolación de Lagrange para estimar valores intermedios.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Punto x₀</Label>
          <Input value={x0Str} onChange={(e) => setX0Str(e.target.value)} className="font-mono" />
        </div>
        <div className="space-y-2">
          <Label>Paso h</Label>
          <Input value={hStr} onChange={(e) => setHStr(e.target.value)} className="font-mono" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Derivada</Label>
          <Select value={order} onValueChange={(v) => { setOrder(v as DiffOrder); setFormula('central'); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1ª derivada f'(x)</SelectItem>
              <SelectItem value="2">2ª derivada f''(x)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Fórmula</Label>
          <Select value={formula} onValueChange={(v) => setFormula(v as DiffFormula)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formulaOptions.map((opt) => (
                <SelectItem value={opt.value}>
                  {opt.label} — {opt.errorOrder}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button className="w-full" onClick={handleCompute} disabled={loading}>
        <LineChart className="mr-2 h-4 w-4" />
        Calcular Derivada
      </Button>

      {result && <NumericalDiffResults result={result} />}
    </div>
  );
}

function NumericalDiffResults({ result }: { result: NumericalDiffResult }) {
  const {
    result: approx,
    formulaStr,
    errorOrder,
    pointsUsed,
    convergenceTable,
    x0,
    h,
    order,
    exactDerivative,
    absoluteError,
  } = result;

  const derivLabel = order === '1' ? "f'(x₀)" : "f''(x₀)";

  return (
    <div className="space-y-4 pt-2">
      {/* Resultado principal */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
              {derivLabel} ≈ (h={fmt(h, 4)})
            </p>
            <p className="font-mono text-3xl font-bold text-primary">{fmt(approx)}</p>
            <Badge variant="outline" className="mt-2 text-xs border-primary/30 text-primary">
              {errorOrder}
            </Badge>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Card className="border-border bg-card">
            <CardContent className="pt-3 pb-3 px-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
                Fórmula aplicada
              </p>
              <p className="font-mono text-xs text-foreground">{formulaStr}</p>
            </CardContent>
          </Card>
          {exactDerivative !== null && (
            <Card className="border-border bg-card">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
                  Derivada exacta (simbólica)
                </p>
                <p className="font-mono text-sm font-semibold">{fmt(exactDerivative)}</p>
                {absoluteError !== null && (
                  <p className="text-xs text-destructive mt-1">
                    Error absoluto: {fmt(absoluteError)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Puntos usados */}
      <details className="group rounded-xl border border-border">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold flex items-center gap-2 select-none">
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-90 text-primary" />
          Evaluaciones de f(x) utilizadas
        </summary>
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2 pt-2">
            {pointsUsed.map((p, i) => (
              <Badge key={i} variant="outline" className="font-mono text-xs">
                {p.label} = {fmt(p.value)}
              </Badge>
            ))}
          </div>
        </div>
      </details>

      {/* Tabla de convergencia */}
      <div>
        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-primary" />
          Convergencia al reducir h
        </p>
        <ScrollArea className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">h</TableHead>
                <TableHead className="text-xs">{derivLabel} aprox.</TableHead>
                <TableHead className="text-xs">|Δ con h anterior|</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {convergenceTable.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{fmt(row.h, 4)}</TableCell>
                  <TableCell className="font-mono text-xs">{fmt(row.approx)}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {row.diff !== null ? fmt(row.diff) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        <p className="text-xs text-muted-foreground mt-1">
          Cada halveo de h reduce el error en un factor ≈{' '}
          {result.errorOrder === 'O(h)'
            ? '2'
            : result.errorOrder === 'O(h²)'
            ? '4'
            : '16'}{' '}
          para una fórmula {result.errorOrder}.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────
// Sección principal
// ─────────────────────────────────

type SubTab = 'splines' | 'diff';

export function InterpolationSection() {
  const [subTab, setSubTab] = useState<SubTab>('splines');

  const tabs: { id: SubTab; label: string; icon: ReactNode; desc: string }[] = [
    {
      id: 'splines',
      label: 'Trazadores Cúbicos',
      icon: <Sigma className="h-4 w-4" />,
      desc: 'Interpolación suave por tramos con splines cúbicos naturales',
    },
    {
      id: 'diff',
      label: 'Diferenciación Numérica',
      icon: <LineChart className="h-4 w-4" />,
      desc: 'Aproximación de derivadas con diferencias finitas',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FunctionSquare className="h-5 w-5 text-violet-400" />
          Interpolación y Diferenciación
        </h2>
        <p className="text-sm text-muted-foreground">
          Módulo 5 — Trazadores cúbicos naturales y derivadas por diferencias finitas
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="grid grid-cols-2 gap-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`rounded-2xl border p-4 text-left transition-all ${
              subTab === t.id
                ? 'border-violet-400/40 bg-violet-500/10 text-foreground shadow-lg shadow-violet-500/10'
                : 'border-border bg-card/60 text-muted-foreground hover:border-violet-400/20 hover:bg-violet-500/5'
            }`}
          >
            <div className={`mb-1 flex items-center gap-2 font-semibold text-sm ${subTab === t.id ? 'text-violet-400' : ''}`}>
              {t.icon}
              {t.label}
            </div>
            <p className="text-xs leading-relaxed">{t.desc}</p>
          </button>
        ))}
      </div>

      {/* Panel activo */}
      <Card className="border-violet-400/20 bg-card/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-violet-400">
            {tabs.find((t) => t.id === subTab)?.icon}
            {tabs.find((t) => t.id === subTab)?.label}
          </CardTitle>
          <CardDescription className="text-xs">
            {tabs.find((t) => t.id === subTab)?.desc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subTab === 'splines' ? <CubicSplinePanel /> : <NumericalDiffPanel />}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { GeoGebraGraph } from '@/components/GeoGebraGraph';
import { TrendingUp, Play, RotateCcw, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IterationTable } from '@/components/shared/IterationTable';
import { NumericalMethods } from '@/lib/numericalMethods';
import { parseNumericInput } from '@/lib/numberParser';
import type { CalculationResult } from '@/types';

type CalculoTab = 'richardson' | 'romberg';

// ─── Richardson ────────────────────────────────────────────────────────────────

function RichardsonForm() {
  const [f, setF] = useState('');
  const [x0, setX0] = useState('');
  const [h0, setH0] = useState('0.5');
  const [levels, setLevels] = useState('6');
  const [derivativeOrder, setDerivativeOrder] = useState<'1' | '2'>('1');
  const [formula, setFormula] = useState<'central' | 'forward' | 'backward'>('central');
  const [tol, setTol] = useState('1e-8');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleCalculate() {
    setError(null);
    setResult(null);

    const parsedX0 = parseNumericInput(x0);
    const parsedH0 = parseNumericInput(h0);
    const parsedLevels = parseInt(levels, 10);
    const parsedTol = parseNumericInput(tol);

    if (!f.trim()) { setError('Ingresa una función f(x).'); return; }
    if (!Number.isFinite(parsedX0)) { setError('El punto x₀ debe ser un número válido.'); return; }
    if (!Number.isFinite(parsedH0) || parsedH0 <= 0) { setError('El paso h₀ debe ser un número positivo.'); return; }
    if (!Number.isFinite(parsedLevels) || parsedLevels < 1) { setError('Los niveles deben ser al menos 1.'); return; }
    if (!Number.isFinite(parsedTol) || parsedTol <= 0) { setError('La tolerancia debe ser un número positivo.'); return; }

    try {
      const res = NumericalMethods.richardson(
        f, parsedX0, parsedH0, parsedLevels,
        derivativeOrder === '2' ? 2 : 1,
        formula, parsedTol,
      );
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado al calcular.');
    }
  }

  function handleReset() {
    setF(''); setX0(''); setH0('0.5'); setLevels('6');
    setDerivativeOrder('1'); setFormula('central'); setTol('1e-8');
    setResult(null); setError(null);
  }

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <Card className="border-[var(--border)] bg-[var(--bg-surface)]">
        <CardContent className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* f(x) */}
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">f(x)</Label>
            <Input
              value={f}
              onChange={(e) => setF(e.target.value)}
              placeholder="Ej: sin(x), x^3 - 2*x, exp(x)"
              className="font-mono"
            />
          </div>

          {/* x₀ */}
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Punto x₀</Label>
            <Input
              value={x0}
              onChange={(e) => setX0(e.target.value)}
              placeholder="Ej: 1"
              className="font-mono"
            />
          </div>

          {/* h₀ */}
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Paso inicial h₀</Label>
            <Input
              value={h0}
              onChange={(e) => setH0(e.target.value)}
              placeholder="Ej: 0.5"
              className="font-mono"
            />
          </div>

          {/* Niveles */}
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Niveles (máx 8)</Label>
            <Input
              value={levels}
              onChange={(e) => setLevels(e.target.value)}
              placeholder="Ej: 6"
              className="font-mono"
            />
          </div>

          {/* Orden de derivada */}
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Orden de derivada</Label>
            <Select value={derivativeOrder} onValueChange={(v) => setDerivativeOrder(v as '1' | '2')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1ª derivada</SelectItem>
                <SelectItem value="2">2ª derivada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fórmula base */}
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Fórmula base</Label>
            <Select
              value={formula}
              onValueChange={(v) => setFormula(v as 'central' | 'forward' | 'backward')}
              
            >
              <SelectTrigger disabled={derivativeOrder === '2'} >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="central">Central (orden 2)</SelectItem>
                <SelectItem value="forward">Adelante (orden 1)</SelectItem>
                <SelectItem value="backward">Atrás (orden 1)</SelectItem>
              </SelectContent>
            </Select>
            {derivativeOrder === '2' && (
              <p className="text-[11px] text-[var(--text-muted)]">2ª derivada usa central siempre.</p>
            )}
          </div>

          {/* Tolerancia */}
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Tolerancia</Label>
            <Input
              value={tol}
              onChange={(e) => setTol(e.target.value)}
              placeholder="Ej: 1e-8"
              className="font-mono"
            />
          </div>

          {/* Botones */}
          <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3">
            <Button
              onClick={handleCalculate}
              className="gap-2 bg-[var(--primary)] text-white hover:opacity-90"
            >
              <Play className="h-4 w-4" />
              Calcular
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error de validación */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="space-y-4">
          {/* Resumen */}
          <Card className={cn(
            'border-[var(--border)]',
            result.converged
              ? 'bg-[linear-gradient(180deg,rgba(16,185,129,0.1),rgba(15,21,18,0.96))]'
              : 'bg-[linear-gradient(180deg,rgba(234,179,8,0.1),rgba(15,21,18,0.96))]',
          )}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="flex items-center gap-3">
                {result.converged
                  ? <CheckCircle className="h-5 w-5 text-[var(--primary)]" />
                  : <XCircle className="h-5 w-5 text-yellow-400" />}
                <div>
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                    {result.converged ? 'Convergió' : 'Sin convergencia'}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{result.message}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Derivada aprox.</p>
                  <p className="mt-1 font-mono text-lg font-bold text-[var(--text-primary)]">
                    {result.root !== null ? result.root.toFixed(10) : 'N/D'}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Error final</p>
                  <p className="mt-1 font-mono text-lg font-bold text-[var(--text-primary)]">
                    {result.error !== null ? result.error.toExponential(4) : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráfica */}
          <GeoGebraGraph
            expressions={[f]}
            points={[{
              x: parseNumericInput(x0),
              y: 0,
              label: `x₀=${x0}  f'≈${result.root?.toFixed(6) ?? ''}`,
            }]}
            xMin={parseNumericInput(x0) - 5}
            xMax={parseNumericInput(x0) + 5}
            yMin={-5}
            yMax={5}
          />

          {/* Tabla triangular */}
          <IterationTable rows={result.iterations} title="Tabla de Richardson (R[fila][columna])" />
        </div>
      )}
    </div>
  );
}

// ─── Romberg ───────────────────────────────────────────────────────────────────

function RombergForm() {
  const [f, setF] = useState('');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [tol, setTol] = useState('1e-8');
  const [maxLevels, setMaxLevels] = useState('8');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleCalculate() {
    setError(null);
    setResult(null);

    const parsedA = parseNumericInput(a);
    const parsedB = parseNumericInput(b);
    const parsedTol = parseNumericInput(tol);
    const parsedLevels = parseInt(maxLevels, 10);

    if (!f.trim()) { setError('Ingresa una función f(x).'); return; }
    if (!Number.isFinite(parsedA)) { setError('El límite inferior a debe ser un número válido.'); return; }
    if (!Number.isFinite(parsedB)) { setError('El límite superior b debe ser un número válido.'); return; }
    if (parsedA === parsedB) { setError('Los límites a y b deben ser distintos.'); return; }
    if (!Number.isFinite(parsedTol) || parsedTol <= 0) { setError('La tolerancia debe ser un número positivo.'); return; }
    if (!Number.isFinite(parsedLevels) || parsedLevels < 1) { setError('Los niveles deben ser al menos 1.'); return; }

    try {
      const res = NumericalMethods.romberg(f, parsedA, parsedB, parsedTol, parsedLevels);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado al calcular.');
    }
  }

  function handleReset() {
    setF(''); setA(''); setB(''); setTol('1e-8'); setMaxLevels('8');
    setResult(null); setError(null);
  }

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <Card className="border-[var(--border)] bg-[var(--bg-surface)]">
        <CardContent className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* f(x) */}
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">f(x)</Label>
            <Input
              value={f}
              onChange={(e) => setF(e.target.value)}
              placeholder="Ej: sin(x), x^2, exp(-x^2)"
              className="font-mono"
            />
          </div>

          {/* a */}
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Límite inferior a</Label>
            <Input
              value={a}
              onChange={(e) => setA(e.target.value)}
              placeholder="Ej: 0"
              className="font-mono"
            />
          </div>

          {/* b */}
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Límite superior b</Label>
            <Input
              value={b}
              onChange={(e) => setB(e.target.value)}
              placeholder="Ej: pi"
              className="font-mono"
            />
          </div>

          {/* Niveles */}
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Niveles máx (máx 12)</Label>
            <Input
              value={maxLevels}
              onChange={(e) => setMaxLevels(e.target.value)}
              placeholder="Ej: 8"
              className="font-mono"
            />
          </div>

          {/* Tolerancia */}
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Tolerancia</Label>
            <Input
              value={tol}
              onChange={(e) => setTol(e.target.value)}
              placeholder="Ej: 1e-8"
              className="font-mono"
            />
          </div>

          {/* Botones */}
          <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3">
            <Button
              onClick={handleCalculate}
              className="gap-2 bg-[var(--primary)] text-white hover:opacity-90"
            >
              <Play className="h-4 w-4" />
              Calcular
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error de validación */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="space-y-4">
          {/* Resumen */}
          <Card className={cn(
            'border-[var(--border)]',
            result.converged
              ? 'bg-[linear-gradient(180deg,rgba(16,185,129,0.1),rgba(15,21,18,0.96))]'
              : 'bg-[linear-gradient(180deg,rgba(234,179,8,0.1),rgba(15,21,18,0.96))]',
          )}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="flex items-center gap-3">
                {result.converged
                  ? <CheckCircle className="h-5 w-5 text-[var(--primary)]" />
                  : <XCircle className="h-5 w-5 text-yellow-400" />}
                <div>
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                    {result.converged ? 'Convergió' : 'Sin convergencia'}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{result.message}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Integral aprox.</p>
                  <p className="mt-1 font-mono text-lg font-bold text-[var(--text-primary)]">
                    {result.root !== null ? result.root.toFixed(10) : 'N/D'}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Error final</p>
                  <p className="mt-1 font-mono text-lg font-bold text-[var(--text-primary)]">
                    {result.error !== null ? result.error.toExponential(4) : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráfica */}
          <GeoGebraGraph
            expressions={[f]}
            points={[
              { x: parseNumericInput(a), y: 0, label: `a=${a}` },
              { x: parseNumericInput(b), y: 0, label: `b=${b}` },
            ]}
            xMin={parseNumericInput(a) - 1}
            xMax={parseNumericInput(b) + 1}
            yMin={-2}
            yMax={10}
          />

          {/* Tabla triangular de Romberg */}
          <IterationTable rows={result.iterations} title="Tabla de Romberg (I[fila][columna])" />
        </div>
      )}
    </div>
  );
}

// ─── Workspace principal ───────────────────────────────────────────────────────

export function CalculoWorkspace() {
  const [activeTab, setActiveTab] = useState<CalculoTab>('richardson');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(15,21,18,0.96))] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Módulo de Cálculo Numérico
        </p>
        <h2 className="mt-3 text-3xl font-extrabold text-[var(--text-primary)]">
          Derivación e Integración
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
          Aproxima derivadas con extrapolación de Richardson y calcula integrales definidas
          con integración de Romberg. Ambos métodos muestran la tabla triangular completa.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('richardson')}
          className={cn(
            'flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors',
            activeTab === 'richardson'
              ? 'border-[var(--primary)] bg-[color:rgba(16,185,129,0.1)] text-[var(--text-primary)]'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]',
          )}
        >
          <TrendingUp className="h-4 w-4" />
          Richardson
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('romberg')}
          className={cn(
            'flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors',
            activeTab === 'romberg'
              ? 'border-[var(--primary)] bg-[color:rgba(16,185,129,0.1)] text-[var(--text-primary)]'
              : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]',
          )}
        >
          <span className="text-base leading-none">∫</span>
          Romberg
        </button>
      </div>

      {/* Contenido activo */}
      {activeTab === 'richardson' ? <RichardsonForm /> : <RombergForm />}
    </div>
  );
}
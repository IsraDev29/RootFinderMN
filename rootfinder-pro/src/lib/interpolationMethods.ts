import { MathEvaluator } from './mathEvaluator';

// ─────────────────────────────────────────────
// Tipos compartidos
// ─────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

// ─────────────────────────────────────────────
// TRAZADORES CÚBICOS NATURALES
// ─────────────────────────────────────────────

export interface SplineTramo {
  a: number;   // xi
  b: number;   // xi+1
  hi: number;
  Mi: number;
  Mi1: number;
  a_coef: number;
  b_coef: number;
  c_coef: number;
  d_coef: number;
}

export interface CubicSplineResult {
  pts: Point[];
  tramos: SplineTramo[];
  M: number[];
  h: number[];
  xeval: number | null;
  seval: number | null;
  errorInterp: number | null;
  f_str: string | null;
}

/** Resuelve un sistema tridiagonal con el Algoritmo de Thomas */
function thomasAlgorithm(
  lower: number[],
  main: number[],
  upper: number[],
  rhs: number[]
): number[] {
  const n = main.length;
  const c = [...upper];
  const d = [...rhs];
  const m = [...main];

  // Eliminación hacia adelante
  for (let i = 1; i < n; i++) {
    const factor = lower[i - 1] / m[i - 1];
    m[i] -= factor * c[i - 1];
    d[i] -= factor * d[i - 1];
  }

  // Sustitución hacia atrás
  const x = new Array(n).fill(0);
  x[n - 1] = d[n - 1] / m[n - 1];
  for (let i = n - 2; i >= 0; i--) {
    x[i] = (d[i] - c[i] * x[i + 1]) / m[i];
  }
  return x;
}

export function computeCubicSpline(
  pts: Point[],
  xeval: number | null,
  f_str: string | null
): CubicSplineResult {
  const sorted = [...pts].sort((a, b) => a.x - b.x);
  const n = sorted.length - 1;

  if (n < 2) {
    throw new Error('Se requieren al menos 3 puntos para calcular trazadores cúbicos.');
  }

  const h = sorted.slice(0, n).map((p, i) => sorted[i + 1].x - p.x);

  const size = n - 1;
  const lower: number[] = [];
  const mainDiag: number[] = [];
  const upperDiag: number[] = [];
  const rhs: number[] = [];

  for (let i = 0; i < size; i++) {
    mainDiag.push(2 * (h[i] + h[i + 1]));
    rhs.push(
      6 *
        ((sorted[i + 2].y - sorted[i + 1].y) / h[i + 1] -
          (sorted[i + 1].y - sorted[i].y) / h[i])
    );
    if (i > 0) lower.push(h[i]);
    if (i < size - 1) upperDiag.push(h[i + 1]);
  }

  const M_inner = thomasAlgorithm(lower, mainDiag, upperDiag, rhs);
  const M = [0, ...M_inner, 0];

  const tramos: SplineTramo[] = sorted.slice(0, n).map((p, i) => {
    const a_coef = M[i] / (6 * h[i]);
    const b_coef = M[i + 1] / (6 * h[i]);
    const c_coef = sorted[i].y / h[i] - (M[i] * h[i]) / 6;
    const d_coef = sorted[i + 1].y / h[i] - (M[i + 1] * h[i]) / 6;
    return {
      a: p.x,
      b: sorted[i + 1].x,
      hi: h[i],
      Mi: M[i],
      Mi1: M[i + 1],
      a_coef,
      b_coef,
      c_coef,
      d_coef,
    };
  });

  let seval: number | null = null;
  if (xeval !== null) {
    const tramo =
      tramos.find((t) => xeval >= t.a && xeval <= t.b) ??
      (xeval < tramos[0].a ? tramos[0] : tramos[tramos.length - 1]);
    const { a_coef, b_coef, c_coef, d_coef, a: xi, b: xi1 } = tramo;
    seval =
      a_coef * (xi1 - xeval) ** 3 +
      b_coef * (xeval - xi) ** 3 +
      c_coef * (xi1 - xeval) +
      d_coef * (xeval - xi);
  }

  let errorInterp: number | null = null;
  if (xeval !== null && seval !== null && f_str) {
    try {
      const yReal = MathEvaluator.evaluate(f_str, xeval);
      errorInterp = Math.abs(yReal - seval);
    } catch {
      errorInterp = null;
    }
  }

  return { pts: sorted, tramos, M, h, xeval, seval, errorInterp, f_str };
}

// ─────────────────────────────────────────────
// DIFERENCIACIÓN NUMÉRICA
// ─────────────────────────────────────────────

export type DiffOrder = '1' | '2';
export type DiffFormula = 'adelante' | 'atras' | 'central' | 'orden4';

export interface DiffFormulaOption {
  value: DiffFormula;
  label: string;
  errorOrder: string;
}

export const DIFF_FORMULA_OPTIONS: Record<DiffOrder, DiffFormulaOption[]> = {
  '1': [
    { value: 'adelante', label: 'Diferencia Hacia Adelante', errorOrder: 'O(h)' },
    { value: 'atras',    label: 'Diferencia Hacia Atrás',   errorOrder: 'O(h)' },
    { value: 'central',  label: 'Diferencia Central',       errorOrder: 'O(h²)' },
    { value: 'orden4',   label: 'Orden 4 — Richardson',     errorOrder: 'O(h⁴)' },
  ],
  '2': [
    { value: 'central',  label: 'Central',                  errorOrder: 'O(h²)' },
    { value: 'orden4',   label: 'Orden 4',                  errorOrder: 'O(h⁴)' },
    { value: 'adelante', label: 'Hacia Adelante',           errorOrder: 'O(h)' },
    { value: 'atras',    label: 'Hacia Atrás',              errorOrder: 'O(h)' },
  ],
};

export interface DiffConvergenceRow {
  h: number;
  approx: number;
  diff: number | null;
}

export interface NumericalDiffResult {
  result: number;
  formulaStr: string;
  errorOrder: string;
  pointsUsed: { label: string; value: number }[];
  convergenceTable: DiffConvergenceRow[];
  x0: number;
  h: number;
  order: DiffOrder;
  formula: DiffFormula;
  f_str: string;
  exactDerivative: number | null;
  absoluteError: number | null;
}

function applyDiffFormula(
  fEval: (x: number) => number,
  x0: number,
  h: number,
  order: DiffOrder,
  formula: DiffFormula
): { result: number; formulaStr: string; errorOrder: string } {
  if (order === '1') {
    switch (formula) {
      case 'adelante':
        return {
          result: (fEval(x0 + h) - fEval(x0)) / h,
          formulaStr: '[f(x+h) − f(x)] / h',
          errorOrder: 'O(h)',
        };
      case 'atras':
        return {
          result: (fEval(x0) - fEval(x0 - h)) / h,
          formulaStr: '[f(x) − f(x−h)] / h',
          errorOrder: 'O(h)',
        };
      case 'central':
        return {
          result: (fEval(x0 + h) - fEval(x0 - h)) / (2 * h),
          formulaStr: '[f(x+h) − f(x−h)] / (2h)',
          errorOrder: 'O(h²)',
        };
      case 'orden4':
        return {
          result:
            (-fEval(x0 + 2 * h) +
              8 * fEval(x0 + h) -
              8 * fEval(x0 - h) +
              fEval(x0 - 2 * h)) /
            (12 * h),
          formulaStr: '[−f(x+2h) + 8f(x+h) − 8f(x−h) + f(x−2h)] / (12h)',
          errorOrder: 'O(h⁴)',
        };
    }
  } else {
    switch (formula) {
      case 'central':
        return {
          result: (fEval(x0 + h) - 2 * fEval(x0) + fEval(x0 - h)) / (h * h),
          formulaStr: '[f(x+h) − 2f(x) + f(x−h)] / h²',
          errorOrder: 'O(h²)',
        };
      case 'orden4':
        return {
          result:
            (-fEval(x0 + 2 * h) +
              16 * fEval(x0 + h) -
              30 * fEval(x0) +
              16 * fEval(x0 - h) -
              fEval(x0 - 2 * h)) /
            (12 * h * h),
          formulaStr: '[−f(x+2h)+16f(x+h)−30f(x)+16f(x−h)−f(x−2h)] / (12h²)',
          errorOrder: 'O(h⁴)',
        };
      case 'adelante':
        return {
          result: (fEval(x0 + 2 * h) - 2 * fEval(x0 + h) + fEval(x0)) / (h * h),
          formulaStr: '[f(x+2h) − 2f(x+h) + f(x)] / h²',
          errorOrder: 'O(h)',
        };
      case 'atras':
        return {
          result: (fEval(x0) - 2 * fEval(x0 - h) + fEval(x0 - 2 * h)) / (h * h),
          formulaStr: '[f(x) − 2f(x−h) + f(x−2h)] / h²',
          errorOrder: 'O(h)',
        };
    }
  }
  throw new Error('Combinación orden/fórmula no reconocida.');
}

/** Construye la función de evaluación a partir de puntos usando interpolación de Lagrange */
export function lagrangeInterpolation(pts: Point[]): (x: number) => number {
  return (x: number) => {
    let sum = 0;
    for (let i = 0; i < pts.length; i++) {
      let term = pts[i].y;
      for (let j = 0; j < pts.length; j++) {
        if (i !== j) term *= (x - pts[j].x) / (pts[i].x - pts[j].x);
      }
      sum += term;
    }
    return sum;
  };
}

export function computeNumericalDiff(
  f_str: string | null,
  pts: Point[] | null,
  x0: number,
  h: number,
  order: DiffOrder,
  formula: DiffFormula
): NumericalDiffResult {
  let fEval: (x: number) => number;

  if (f_str) {
    fEval = (x: number) => MathEvaluator.evaluate(f_str, x);
  } else if (pts && pts.length >= 3) {
    fEval = lagrangeInterpolation(pts);
  } else {
    throw new Error('Se requiere una función f(x) o al menos 3 puntos.');
  }

  const { result, formulaStr, errorOrder } = applyDiffFormula(fEval, x0, h, order, formula);

  // Puntos usados en el cálculo
  const pointsUsed: { label: string; value: number }[] = [];
  const addPt = (label: string, xVal: number) =>
    pointsUsed.push({ label, value: fEval(xVal) });

  if (formula === 'adelante') {
    addPt(`f(x₀) = f(${x0})`, x0);
    addPt(`f(x₀+h) = f(${x0 + h})`, x0 + h);
    if (order === '2') addPt(`f(x₀+2h) = f(${x0 + 2 * h})`, x0 + 2 * h);
  } else if (formula === 'atras') {
    addPt(`f(x₀) = f(${x0})`, x0);
    addPt(`f(x₀−h) = f(${x0 - h})`, x0 - h);
    if (order === '2') addPt(`f(x₀−2h) = f(${x0 - 2 * h})`, x0 - 2 * h);
  } else if (formula === 'central') {
    addPt(`f(x₀−h) = f(${x0 - h})`, x0 - h);
    addPt(`f(x₀) = f(${x0})`, x0);
    addPt(`f(x₀+h) = f(${x0 + h})`, x0 + h);
  } else if (formula === 'orden4') {
    addPt(`f(x₀−2h) = f(${x0 - 2 * h})`, x0 - 2 * h);
    addPt(`f(x₀−h) = f(${x0 - h})`, x0 - h);
    addPt(`f(x₀) = f(${x0})`, x0);
    addPt(`f(x₀+h) = f(${x0 + h})`, x0 + h);
    addPt(`f(x₀+2h) = f(${x0 + 2 * h})`, x0 + 2 * h);
  }

  // Tabla de convergencia reduciendo h
  const hValues = [h, h / 2, h / 4, h / 8, h / 16];
  const convergenceTable: DiffConvergenceRow[] = [];
  let prevVal: number | null = null;
  for (const hi of hValues) {
    try {
      const { result: vi } = applyDiffFormula(fEval, x0, hi, order, formula);
      convergenceTable.push({
        h: hi,
        approx: vi,
        diff: prevVal !== null ? Math.abs(vi - prevVal) : null,
      });
      prevVal = vi;
    } catch {
      convergenceTable.push({ h: hi, approx: NaN, diff: null });
    }
  }

  // Derivada exacta (solo si tenemos la función como string)
  let exactDerivative: number | null = null;
  let absoluteError: number | null = null;
  if (f_str) {
    try {
      exactDerivative = MathEvaluator.evaluateNthDerivative(
        f_str,
        order === '1' ? 1 : 2,
        { x: x0 },
        'x'
      );
      if (Number.isFinite(exactDerivative)) {
        absoluteError = Math.abs(result - exactDerivative);
      }
    } catch {
      exactDerivative = null;
    }
  }

  return {
    result,
    formulaStr,
    errorOrder,
    pointsUsed,
    convergenceTable,
    x0,
    h,
    order,
    formula,
    f_str: f_str ?? `Interpolación Lagrange (${pts?.length} pts)`,
    exactDerivative,
    absoluteError,
  };
}

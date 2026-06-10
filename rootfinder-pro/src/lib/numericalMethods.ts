import { MathEvaluator } from './mathEvaluator';
import {
  IterationData,
  CalculationResult,
  MethodType,
  FixedPointCandidate,
  SystemCalculationResult,
  SystemIterationData,
} from '../types';

export class NumericalMethods {
<<<<<<< Updated upstream
  private static readonly FIXED_POINT_TOLERANCE = 0.98;

  private static calculateError(current: number, previous: number | null): { ea: number; er: number } {
    if (previous === null) return { ea: 0, er: 0 };
    const ea = Math.abs(current - previous);
    const er = current !== 0 ? (ea / Math.abs(current)) * 100 : 0;
    return { ea, er };
  }

  private static formatLambda(lambda: number): string {
    return Number(lambda.toFixed(12)).toString();
  }

  private static buildFixedPointExpression(f: string, lambda: number): string {
    const lambdaText = this.formatLambda(lambda);
    if (lambda >= 0) {
      return `x + (${lambdaText}) * (${f})`;
    }
    return `x - (${this.formatLambda(Math.abs(lambda))}) * (${f})`;
  }
=======
  private static readonly FIXED_POINT_TOLERANCE = 1;
  private static readonly MAX_RICHARDSON_LEVELS = 8;
  private static readonly MAX_ROMBERG_LEVELS = 12;
>>>>>>> Stashed changes

  static generateFixedPointCandidates(
    f: string,
    referencePoint: number,
    interval?: { a?: number; b?: number }
  ): FixedPointCandidate[] {
    const candidates: FixedPointCandidate[] = [];
    const seen = new Set<string>();
    const derivativeAtReference = MathEvaluator.derivative(f, referencePoint);

    const baseLambdas: number[] = [];

    if (Math.abs(derivativeAtReference) > 1e-8) {
      const optimalLambda = -1 / derivativeAtReference;
      baseLambdas.push(
        optimalLambda,
        optimalLambda * 0.5,
        optimalLambda * 1.5,
        optimalLambda * 0.25,
        optimalLambda * 0.75,
      );
    }

    baseLambdas.push(-1, -0.5, -0.25, -0.1, 0.1, 0.25, 0.5, 1);

    for (const rawLambda of baseLambdas) {
      if (!Number.isFinite(rawLambda) || Math.abs(rawLambda) < 1e-12) continue;

      const lambda = Number(rawLambda.toFixed(12));
      const expression = this.buildFixedPointExpression(f, lambda);
      if (seen.has(expression)) continue;
      seen.add(expression);

      try {
        const derivativeValue = Math.abs(MathEvaluator.derivative(expression, referencePoint));
        const convergent = derivativeValue < this.FIXED_POINT_TOLERANCE;
        const reason = convergent
          ? `|g'(x)| = ${derivativeValue.toFixed(6)} < 1`
          : `|g'(x)| = ${derivativeValue.toFixed(6)} >= 1`;

        if (interval?.a !== undefined && interval?.b !== undefined) {
          const mid = (interval.a + interval.b) / 2;
          MathEvaluator.evaluate(expression, interval.a);
          MathEvaluator.evaluate(expression, interval.b);
          MathEvaluator.evaluate(expression, mid);
        } else {
          MathEvaluator.evaluate(expression, referencePoint);
        }

        candidates.push({
          expression,
          lambda,
          derivativeAtPoint: derivativeValue,
          convergent,
          reason,
        });
      } catch {
        candidates.push({
          expression,
          lambda,
          derivativeAtPoint: null,
          convergent: false,
          reason: 'No se pudo evaluar de forma estable',
        });
      }
    }

    return candidates.sort((left, right) => {
      if (left.convergent !== right.convergent) {
        return left.convergent ? -1 : 1;
      }

      const leftScore = left.derivativeAtPoint ?? Number.POSITIVE_INFINITY;
      const rightScore = right.derivativeAtPoint ?? Number.POSITIVE_INFINITY;
      return leftScore - rightScore;
    });
  }

  static selectFixedPointTransformation(
    f: string,
    referencePoint: number,
    interval?: { a?: number; b?: number }
  ): { selected: FixedPointCandidate | null; candidates: FixedPointCandidate[] } {
    const candidates = this.generateFixedPointCandidates(f, referencePoint, interval);
    const selected = candidates.find((candidate) => candidate.convergent) ?? null;
    return { selected, candidates };
  }

  static bisection(
    f: string,
    a: number,
    b: number,
    tol: number,
    maxIter: number
  ): CalculationResult {
    const iterations: IterationData[] = [];
    const params = { a, b, tol, maxIter };
    let fa = MathEvaluator.evaluate(f, a);
    let fb = MathEvaluator.evaluate(f, b);

    if (Math.abs(fa) < 1e-15) {
      return this.successResult('bisection', f, a, [], true, params);
    }

    if (Math.abs(fb) < 1e-15) {
      return this.successResult('bisection', f, b, [], true, params);
    }

    if (fa * fb > 0) {
      return this.errorResult('bisection', f, 'No hay cambio de signo en el intervalo [a, b]', params);
    }

    let xr = a;
    let xrOld: number | null = null;
    let converged = false;

    for (let i = 1; i <= maxIter; i++) {
      xrOld = xr;
      xr = (a + b) / 2;
      const fxr = MathEvaluator.evaluate(f, xr);
      const { ea, er } = this.calculateError(xr, i === 1 ? null : xrOld);

      iterations.push({
        iteration: i,
        a,
        b,
        xr,
        fa,
        fb,
        fxr,
        ea,
        er: er.toFixed(6) + '%'
      });

      if (Math.abs(fxr) < 1e-15 || (i > 1 && ea <= tol)) {
        converged = true;
        break;
      }

      if (fa * fxr < 0) {
        b = xr;
        fb = fxr;
      } else {
        a = xr;
        fa = fxr;
      }
    }

    return this.successResult('bisection', f, xr, iterations, converged, params);
  }

  static falsePosition(
    f: string,
    a: number,
    b: number,
    tol: number,
    maxIter: number
  ): CalculationResult {
    const iterations: IterationData[] = [];
    const params = { a, b, tol, maxIter };
    let fa = MathEvaluator.evaluate(f, a);
    let fb = MathEvaluator.evaluate(f, b);

    if (Math.abs(fa) < 1e-15) {
      return this.successResult('false-position', f, a, [], true, params);
    }

    if (Math.abs(fb) < 1e-15) {
      return this.successResult('false-position', f, b, [], true, params);
    }

    if (fa * fb > 0) {
      return this.errorResult('false-position', f, 'No hay cambio de signo en el intervalo [a, b]', params);
    }

    let xr = a;
    let xrOld: number | null = null;
    let converged = false;

    for (let i = 1; i <= maxIter; i++) {
      xrOld = xr;
      xr = b - (fb * (a - b)) / (fa - fb);
      const fxr = MathEvaluator.evaluate(f, xr);
      const { ea, er } = this.calculateError(xr, i === 1 ? null : xrOld);

      iterations.push({
        iteration: i,
        a,
        b,
        xr,
        fa,
        fb,
        fxr,
        ea,
        er: er.toFixed(6) + '%'
      });

      if (Math.abs(fxr) < 1e-15 || (i > 1 && ea <= tol)) {
        converged = true;
        break;
      }

      if (fa * fxr < 0) {
        b = xr;
        fb = fxr;
      } else {
        a = xr;
        fa = fxr;
      }
    }

    return this.successResult('false-position', f, xr, iterations, converged, params);
  }

  static newtonRaphson(
    f: string,
    x0: number,
    tol: number,
    maxIter: number
  ): CalculationResult {
    const iterations: IterationData[] = [];
    let xi = x0;
    let converged = false;

    for (let i = 1; i <= maxIter; i++) {
      const fxi = MathEvaluator.evaluate(f, xi);
      const df = MathEvaluator.derivative(f, xi);

      if (Math.abs(df) < 1e-12) {
        return this.errorResult('newton-raphson', f, 'Derivada cercana a cero', { x0, tol, maxIter });
      }

      const xiNext = xi - fxi / df;
      const fxiNext = MathEvaluator.evaluate(f, xiNext);
      const { ea, er } = this.calculateError(xiNext, xi);

      iterations.push({
        iteration: i,
        xi,
        fxi,
        df,
        xiNext,
        ea,
        er: er.toFixed(6) + '%'
      });

      if (Math.abs(fxiNext) < 1e-15 || ea <= tol) {
        xi = xiNext;
        converged = true;
        break;
      }

      xi = xiNext;
    }

    return this.successResult('newton-raphson', f, xi, iterations, converged, { x0, tol, maxIter });
  }

  static secant(
    f: string,
    x0: number,
    x1: number,
    tol: number,
    maxIter: number
  ): CalculationResult {
    const iterations: IterationData[] = [];
    let xi_prev = x0;
    let xi = x1;
    let converged = false;

    for (let i = 1; i <= maxIter; i++) {
      const fxi = MathEvaluator.evaluate(f, xi);
      const fxi_prev = MathEvaluator.evaluate(f, xi_prev);

      if (Math.abs(fxi - fxi_prev) < 1e-12) {
        return this.errorResult('secant', f, 'División por cero en la secante', { x0, x1, tol, maxIter });
      }

      const xi_next = xi - (fxi * (xi_prev - xi)) / (fxi_prev - fxi);
      const fxiNext = MathEvaluator.evaluate(f, xi_next);
      const { ea, er } = this.calculateError(xi_next, xi);

      iterations.push({
        iteration: i,
        xi_prev,
        xi,
        fxi_prev,
        fxi,
        xi_next,
        ea,
        er: er.toFixed(6) + '%'
      });

      if (Math.abs(fxiNext) < 1e-15 || ea <= tol) {
        xi = xi_next;
        converged = true;
        break;
      }

      xi_prev = xi;
      xi = xi_next;
    }

    return this.successResult('secant', f, xi, iterations, converged, { x0, x1, tol, maxIter });
  }

  static fixedPoint(
    f: string,
    x0: number,
    tol: number,
    maxIter: number,
    g1Value?: number,
    interval?: { a?: number; b?: number }
  ): CalculationResult {
    const referencePoint = g1Value !== undefined ? g1Value : x0;
    const { selected, candidates } = this.selectFixedPointTransformation(f, referencePoint, interval);

    if (!selected) {
      return this.errorResult(
        'fixed-point',
        f,
        'No se encontró una transformación g(x) convergente a partir de f(x)',
        { x0, tol, maxIter, g1Value, candidates }
      );
    }

    return this.fixedPointWithTransformation(
      f,
      selected.expression,
      x0,
      tol,
      maxIter,
      g1Value,
      candidates,
      selected.derivativeAtPoint
    );
  }

  static fixedPointWithTransformation(
    f: string,
    g: string,
    x0: number,
    tol: number,
    maxIter: number,
    g1Value?: number,
    candidates: FixedPointCandidate[] = [],
    selectedDerivative?: number | null
  ): CalculationResult {
    const iterations: IterationData[] = [];
    let xi = x0;
    let converged = false;
    const referencePoint = g1Value !== undefined ? g1Value : x0;
    const params = {
      x0,
      tol,
      maxIter,
      g1Value,
      selectedG: g,
      selectedDerivative: selectedDerivative ?? null,
      candidates,
    };

    try {
      const dg = MathEvaluator.derivative(g, referencePoint);
      if (Math.abs(dg) >= 1) {
        console.warn(`El criterio de convergencia no se cumple en x=${referencePoint}: |g'(x)| = ${Math.abs(dg).toFixed(4)} >= 1. El método podría divergir.`);
      }
    } catch {
      console.warn("No se pudo evaluar la derivada de g(x) para el criterio de convergencia.");
    }

    for (let i = 1; i <= maxIter; i++) {
      let xiNext: number;
      let dgi: number | null = null;
      let fxi: number | null = null;
      
      try {
        xiNext = MathEvaluator.evaluate(g, xi);
        fxi = MathEvaluator.evaluate(f, xi);
        try {
          dgi = MathEvaluator.derivative(g, xi);
        } catch {}
      } catch (e) {
        return this.errorResult('fixed-point', f, 'Error evaluando g(x) o f(x)', params, g);
      }

      const { ea, er } = this.calculateError(xiNext, xi);

      iterations.push({
        iteration: i,
        xi,
        fxi: fxi !== null ? fxi : 'N/A',
        xiNext,
        dgi: dgi !== null ? dgi.toFixed(6) : 'N/A',
        ea,
        er: er.toFixed(6) + '%'
      });

      if (ea <= tol || (fxi !== null && Math.abs(fxi) < 1e-15)) {
        xi = xiNext;
        converged = true;
        break;
      }

      xi = xiNext;
      
      if (!isFinite(xi) || Math.abs(xi) > 1e15) {
        return this.errorResult('fixed-point', f, 'El método diverge', params, g);
      }
    }

    return this.successResult('fixed-point', f, xi, iterations, converged, params, g);
  }

<<<<<<< Updated upstream
=======
  /**
   * Aproxima derivadas usando extrapolacion de Richardson sobre diferencias finitas.
   */
  static richardson(
    f: string,
    x0: number,
    h0: number,
    levels: number,
    derivativeOrder: 1 | 2,
    baseFormula: 'central' | 'forward' | 'backward',
    tol: number,
  ): CalculationResult {
    if (!Number.isFinite(x0)) {
      return this.errorResult('richardson', f, 'El punto x0 debe ser numerico', { x0, h0, levels, derivativeOrder, baseFormula, tol });
    }
    if (!Number.isFinite(h0) || h0 <= 0) {
      return this.errorResult('richardson', f, 'El paso h inicial debe ser positivo', { x0, h0, levels, derivativeOrder, baseFormula, tol });
    }

    const safeLevels = Math.min(Math.max(Math.trunc(levels), 1), this.MAX_RICHARDSON_LEVELS);
    const effectiveFormula = derivativeOrder === 2 ? 'central' : baseFormula;
    const baseOrder = effectiveFormula === 'central' ? 2 : 1;
    const table = Array.from({ length: safeLevels }, () => Array<number | null>(safeLevels).fill(null));
    const iterations: IterationData[] = [];
    const params = {
      x0,
      h0,
      levels: safeLevels,
      requestedLevels: levels,
      derivativeOrder,
      baseFormula: effectiveFormula,
      tol,
      baseOrder,
    };

    try {
      for (let row = 0; row < safeLevels; row += 1) {
        const h = h0 / 2 ** row;
        table[row][0] = this.finiteDifference(f, x0, h, derivativeOrder, effectiveFormula);
      }

      for (let column = 1; column < safeLevels; column += 1) {
        const factor = 2 ** (baseOrder * column);
        for (let row = column; row < safeLevels; row += 1) {
          const current = table[row][column - 1];
          const previous = table[row - 1][column - 1];
          if (current === null || previous === null) {
            continue;
          }

          table[row][column] = (factor * current - previous) / (factor - 1);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo evaluar la funcion para Richardson';
      return this.errorResult('richardson', f, message, params);
    }

    let converged = safeLevels === 1;
    let bestEstimate = table[0][0] as number;
    let lastError = 0;

    for (let row = 0; row < safeLevels; row += 1) {
      const diagonal = table[row][row] ?? this.lastFiniteTableValue(table[row]) ?? bestEstimate;
      const previousDiagonal = row > 0 ? table[row - 1][row - 1] : null;
      const ea = previousDiagonal !== null ? Math.abs(diagonal - previousDiagonal) : 0;
      lastError = ea;
      bestEstimate = diagonal;
      if (row > 0 && ea <= tol) {
        converged = true;
      }

      const iteration: IterationData = {
        iteration: row + 1,
        h: h0 / 2 ** row,
        ea,
        er: diagonal !== 0 ? `${((ea / Math.abs(diagonal)) * 100).toFixed(6)}%` : '0.000000%',
      };

      for (let column = 0; column < safeLevels; column += 1) {
        iteration[`R${column}`] = table[row][column] ?? '-';
      }

      iterations.push(iteration);
    }

    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      method: 'richardson',
      functionF: f,
      root: bestEstimate,
      error: lastError,
      iterations,
      converged,
      message: converged
        ? 'Extrapolacion de Richardson estabilizada'
        : 'Richardson termino con la mejor aproximacion disponible',
      params,
    };
  }

  /**
   * Integra f(x) en [a, b] usando Romberg: trapecio compuesto + extrapolacion de Richardson.
   */
  static romberg(f: string, a: number, b: number, tol: number, maxLevels: number): CalculationResult {
    const requestedLevels = Math.trunc(maxLevels);
    const levels = Math.min(Math.max(requestedLevels, 1), this.MAX_ROMBERG_LEVELS);
    const params = { a, b, tol, maxLevels: levels, requestedLevels };

    if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) {
      return this.errorResult('romberg', f, 'El intervalo [a, b] debe tener extremos numericos distintos', params);
    }

    const table = Array.from({ length: levels }, () => Array<number | null>(levels).fill(null));
    const iterations: IterationData[] = [];
    let converged = levels === 1;
    let bestEstimate = 0;
    let lastError = 0;

    try {
      for (let row = 0; row < levels; row += 1) {
        const subIntervals = 2 ** row;
        table[row][0] = this.compositeTrapezoid(f, a, b, subIntervals);

        for (let column = 1; column <= row; column += 1) {
          const factor = 4 ** column;
          const current = table[row][column - 1];
          const previous = table[row - 1][column - 1];
          if (current === null || previous === null) {
            continue;
          }

          table[row][column] = (factor * current - previous) / (factor - 1);
        }

        const diagonal = table[row][row] ?? this.lastFiniteTableValue(table[row]) ?? 0;
        const previousDiagonal = row > 0 ? table[row - 1][row - 1] : null;
        const ea = previousDiagonal !== null ? Math.abs(diagonal - previousDiagonal) : 0;
        bestEstimate = diagonal;
        lastError = ea;

        const iteration: IterationData = {
          iteration: row + 1,
          n: subIntervals,
          h: Math.abs(b - a) / subIntervals,
          ea,
          er: diagonal !== 0 ? `${((ea / Math.abs(diagonal)) * 100).toFixed(6)}%` : '0.000000%',
        };

        for (let column = 0; column < levels; column += 1) {
          iteration[`I${column + 1}`] = table[row][column] ?? '-';
        }

        iterations.push(iteration);

        if (row > 0 && ea <= tol) {
          converged = true;
          break;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo evaluar la integral de Romberg';
      return this.errorResult('romberg', f, message, params);
    }

    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      method: 'romberg',
      functionF: f,
      root: bestEstimate,
      error: lastError,
      iterations,
      converged,
      message: converged
        ? 'Integracion de Romberg estabilizada'
        : 'Romberg termino con la mejor aproximacion disponible',
      params,
    };
  }

  /**
   * Resuelve un sistema no lineal n x n por Newton-Raphson.
   */
  static newtonRaphsonSystem(
    functions: string[],
    variables: string[],
    initialValues: number[],
    tol: number,
    maxIter: number,
  ): SystemCalculationResult {
    const iterations: SystemIterationData[] = [];
    let vector = [...initialValues];
    let converged = false;
    let warningMessage: string | null = null;
    let previousEa: number | null = null;
    let stagnationCount = 0;
    const params = { functions, variables, initialValues, tol, maxIter, n: functions.length };

    if (functions.length < 2 || variables.length < 2) {
      return this.systemNErrorResult('El sistema debe tener al menos 2 ecuaciones y 2 variables', params, functions, variables, iterations);
    }
    if (functions.length !== variables.length || initialValues.length !== variables.length) {
      return this.systemNErrorResult('Newton-Raphson requiere un sistema cuadrado n x n', params, functions, variables, iterations);
    }

    for (let iteration = 1; iteration <= maxIter; iteration += 1) {
      const scope = this.buildSystemScope(variables, vector);
      const fValues = functions.map((fn) => MathEvaluator.evaluateWithScope(fn, scope));
      const jacobian = functions.map((fn) => variables.map((variable) => MathEvaluator.partialDerivative(fn, variable, scope)));

      let delta: number[];
      try {
        delta = this.solveLinearSystem(jacobian, fValues.map((value) => -value));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Jacobiana singular o casi singular';
        return this.systemNErrorResult(message, params, functions, variables, iterations);
      }

      const nextVector = vector.map((value, index) => value + delta[index]);
      const nextScope = this.buildSystemScope(variables, nextVector);
      const nextFValues = functions.map((fn) => MathEvaluator.evaluateWithScope(fn, nextScope));
      const ea = Math.max(...delta.map((value) => Math.abs(value)));
      const denominator = Math.max(...nextVector.map((value) => Math.abs(value)), 1);
      const er = (ea / denominator) * 100;
      const row: SystemIterationData = {
        iteration,
        vector: [...vector],
        fValues,
        jacobian,
        delta,
        nextVector,
        ea,
        er: `${er.toFixed(6)}%`,
      };

      variables.forEach((variable, index) => {
        row[variable] = vector[index];
        row[`F${index + 1}`] = fValues[index];
        row[`d${variable}`] = delta[index];
        row[`${variable}Next`] = nextVector[index];
      });

      iterations.push(row);
      vector = nextVector;

      if (vector.some((value) => !Number.isFinite(value))) {
        return this.systemNErrorResult('La iteracion produjo valores no finitos', params, functions, variables, iterations);
      }

      if (previousEa !== null && iteration > 5) {
        const improvementRatio = previousEa === 0 ? 1 : (previousEa - ea) / previousEa;
        if (improvementRatio < 0.001) {
          stagnationCount += 1;
          warningMessage = 'Advertencia: posible estancamiento o convergencia lenta del sistema';
        } else {
          stagnationCount = 0;
        }
      }
      previousEa = ea;

      if (ea <= tol || Math.max(...nextFValues.map((value) => Math.abs(value))) < 1e-15) {
        converged = true;
        break;
      }

      if (stagnationCount >= 3 && iteration < maxIter) {
        break;
      }
    }

    const lastIteration = iterations[iterations.length - 1];
    const message = converged
      ? warningMessage ?? 'Convergencia alcanzada para el sistema'
      : warningMessage ?? 'No se alcanzo la convergencia en el maximo de iteraciones';

    return {
      functionF1: functions[0] ?? '',
      functionF2: functions[1] ?? '',
      functions,
      variables,
      solution: this.buildSystemSolution(variables, vector),
      error: lastIteration?.ea ?? null,
      iterations,
      converged,
      message,
      params,
    };
  }

  /**
   * Resuelve el caso 2x2 conservando compatibilidad con la UI actual.
   */
>>>>>>> Stashed changes
  static newtonRaphsonSystem2x2(
    f1: string,
    f2: string,
    x0: number,
    y0: number,
    tol: number,
    maxIter: number
  ): SystemCalculationResult {
    const iterations: SystemIterationData[] = [];
    let x = x0;
    let y = y0;
    let converged = false;
    const params = { f1, f2, x0, y0, tol, maxIter };

    for (let i = 1; i <= maxIter; i++) {
      const scope = { x, y };
      const fx1 = MathEvaluator.evaluateWithScope(f1, scope);
      const fx2 = MathEvaluator.evaluateWithScope(f2, scope);

      const j11 = MathEvaluator.partialDerivative(f1, 'x', scope);
      const j12 = MathEvaluator.partialDerivative(f1, 'y', scope);
      const j21 = MathEvaluator.partialDerivative(f2, 'x', scope);
      const j22 = MathEvaluator.partialDerivative(f2, 'y', scope);

<<<<<<< Updated upstream
      const det = j11 * j22 - j12 * j21;
      if (Math.abs(det) < 1e-12) {
        return this.systemErrorResult('Jacobiana singular o casi singular', params, f1, f2, iterations);
=======
  private static formatLambda(lambda: number): string {
    return Number(lambda.toFixed(12)).toString();
  }

  private static buildFixedPointExpression(f: string, lambda: number): string {
    const lambdaText = this.formatLambda(lambda);
    if (lambda >= 0) {
      return `x + (${lambdaText}) * (${f})`;
    }

    return `x - (${this.formatLambda(Math.abs(lambda))}) * (${f})`;
  }

  private static finiteDifference(
    f: string,
    x0: number,
    h: number,
    derivativeOrder: 1 | 2,
    formula: 'central' | 'forward' | 'backward',
  ): number {
    let value: number;
    if (derivativeOrder === 1) {
      if (formula === 'forward') {
        value = (MathEvaluator.evaluate(f, x0 + h) - MathEvaluator.evaluate(f, x0)) / h;
      } else if (formula === 'backward') {
        value = (MathEvaluator.evaluate(f, x0) - MathEvaluator.evaluate(f, x0 - h)) / h;
      } else {
        value = (MathEvaluator.evaluate(f, x0 + h) - MathEvaluator.evaluate(f, x0 - h)) / (2 * h);
      }
    } else {
      value = (MathEvaluator.evaluate(f, x0 + h) - 2 * MathEvaluator.evaluate(f, x0) + MathEvaluator.evaluate(f, x0 - h)) / (h * h);
    }

    if (!Number.isFinite(value)) {
      throw new Error('La aproximacion produjo un valor no finito');
    }

    return value;
  }

  private static compositeTrapezoid(f: string, a: number, b: number, subIntervals: number): number {
    const h = (b - a) / subIntervals;
    let sum = 0.5 * (MathEvaluator.evaluate(f, a) + MathEvaluator.evaluate(f, b));

    for (let index = 1; index < subIntervals; index += 1) {
      const x = a + index * h;
      const value = MathEvaluator.evaluate(f, x);
      if (!Number.isFinite(value)) {
        throw new Error(`f(x) no es finita en x = ${x}`);
      }
      sum += value;
    }

    const result = sum * h;
    if (!Number.isFinite(result)) {
      throw new Error('La regla del trapecio produjo un valor no finito');
    }

    return result;
  }

  private static lastFiniteTableValue(row: Array<number | null>): number | null {
    for (let index = row.length - 1; index >= 0; index -= 1) {
      const value = row[index];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
    }

    return null;
  }

  private static buildSystemScope(variables: string[], values: number[]): Record<string, number> {
    return variables.reduce<Record<string, number>>((scope, variable, index) => {
      scope[variable] = values[index];
      return scope;
    }, {});
  }

  private static buildSystemSolution(variables: string[], values: number[]) {
    return variables.reduce<{ x?: number; y?: number; values: number[]; [key: string]: number | number[] | undefined }>(
      (solution, variable, index) => {
        solution[variable] = values[index];
        return solution;
      },
      { values: [...values] },
    );
  }

  private static solveLinearSystem(matrix: number[][], rhs: number[]): number[] {
    const size = matrix.length;
    const augmented = matrix.map((row, index) => [...row, rhs[index]]);
    const scale = Math.max(1, ...matrix.flat().map((value) => Math.abs(value)));
    const pivotTolerance = 1e-12 * scale;

    for (let column = 0; column < size; column += 1) {
      let pivotRow = column;
      for (let row = column + 1; row < size; row += 1) {
        if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivotRow][column])) {
          pivotRow = row;
        }
>>>>>>> Stashed changes
      }

      const deltaX = (-fx1 * j22 + j12 * fx2) / det;
      const deltaY = (j21 * fx1 - j11 * fx2) / det;
      const xNext = x + deltaX;
      const yNext = y + deltaY;
      const nextScope = { x: xNext, y: yNext };
      const nextF1 = MathEvaluator.evaluateWithScope(f1, nextScope);
      const nextF2 = MathEvaluator.evaluateWithScope(f2, nextScope);
      const ea = Math.max(Math.abs(deltaX), Math.abs(deltaY));
      const denom = Math.max(Math.abs(xNext), Math.abs(yNext), 1);
      const er = (ea / denom) * 100;

      iterations.push({
        iteration: i,
        x,
        y,
        f1: fx1,
        f2: fx2,
        j11,
        j12,
        j21,
        j22,
        deltaX,
        deltaY,
        xNext,
        yNext,
        ea,
        er: er.toFixed(6) + '%',
      });

      x = xNext;
      y = yNext;

      if (!isFinite(x) || !isFinite(y)) {
        return this.systemErrorResult('La iteración produjo valores no finitos', params, f1, f2, iterations);
      }

      if (ea <= tol || Math.max(Math.abs(nextF1), Math.abs(nextF2)) < 1e-15) {
        converged = true;
        break;
      }
    }

    const lastIter = iterations[iterations.length - 1];
    return {
      functionF1: f1,
      functionF2: f2,
      solution: { x, y },
      error: lastIter?.ea ?? null,
      iterations,
      converged,
      message: converged
        ? 'Convergencia alcanzada para el sistema'
        : 'No se alcanzó la convergencia en el máximo de iteraciones',
      params,
    };
  }

  private static systemErrorResult(
    message: string,
    params: Record<string, any>,
    f1: string,
    f2: string,
    iterations: SystemIterationData[] = []
  ): SystemCalculationResult {
    return {
      functionF1: f1,
      functionF2: f2,
      solution: null,
      error: iterations[iterations.length - 1]?.ea ?? null,
      iterations,
      converged: false,
      message,
      params,
    };
  }

  private static errorResult(method: MethodType, f: string, message: string, params: any, g?: string): CalculationResult {
    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      method,
      functionF: f,
      functionG: g,
      root: null,
      error: null,
      iterations: [],
      converged: false,
      message,
      params
    };
  }

  private static successResult(
    method: MethodType,
    f: string,
    root: number,
    iterations: IterationData[],
    converged: boolean,
    params: any,
    g?: string
  ): CalculationResult {
    const lastIter = iterations[iterations.length - 1];
    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      method,
      functionF: f,
      functionG: g,
      root,
      error: typeof lastIter?.ea === 'number' ? lastIter.ea : null,
      iterations,
      converged,
      message: converged ? 'Convergencia alcanzada' : 'No se alcanzó la convergencia en el máximo de iteraciones',
      params
    };
  }
}

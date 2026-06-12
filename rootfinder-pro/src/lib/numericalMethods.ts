import { MathEvaluator } from './mathEvaluator';
import {
  IterationData,
  CalculationResult,
  MethodType,
  FixedPointCandidate,
  SystemCalculationResult,
  SystemIterationData,
} from '../types';

/**
 * Implementa los métodos numéricos principales de la aplicación.
 */
export class NumericalMethods {
  private static readonly FIXED_POINT_TOLERANCE = 1;

  /**
   * Genera candidatas g(x) para el método de punto fijo.
   */
  static generateFixedPointCandidates(
    f: string,
    referencePoint: number,
    interval?: { a?: number; b?: number },
  ): FixedPointCandidate[] {
    const candidates: FixedPointCandidate[] = [];
    const seen = new Set<string>();
    let derivativeAtReference: number | null = null;
    const baseLambdas: number[] = [];

    try {
      derivativeAtReference = MathEvaluator.derivative(f, referencePoint);
      if (Math.abs(derivativeAtReference) > 1e-8) {
        const optimalLambda = -1 / derivativeAtReference;
        baseLambdas.push(optimalLambda, optimalLambda * 0.5, optimalLambda * 1.5, optimalLambda * 0.25, optimalLambda * 0.75);
      }
    } catch {
      derivativeAtReference = null;
    }

    baseLambdas.push(-1, -0.5, -0.25, -0.1, 0.1, 0.25, 0.5, 1);

    for (const rawLambda of baseLambdas) {
      if (!Number.isFinite(rawLambda) || Math.abs(rawLambda) < 1e-12) {
        continue;
      }

      const lambda = Number(rawLambda.toFixed(12));
      const expression = this.buildFixedPointExpression(f, lambda);
      if (seen.has(expression)) {
        continue;
      }
      seen.add(expression);

      try {
        const derivativeValue = Math.abs(MathEvaluator.derivative(expression, referencePoint));
        const convergent = derivativeValue < this.FIXED_POINT_TOLERANCE;
        const reason = convergent
          ? `|g'(x)| = ${derivativeValue.toFixed(6)} < 1`
          : `|g'(x)| = ${derivativeValue.toFixed(6)} >= 1`;

        if (interval?.a !== undefined && interval?.b !== undefined) {
          const midpoint = (interval.a + interval.b) / 2;
          MathEvaluator.evaluate(expression, interval.a);
          MathEvaluator.evaluate(expression, interval.b);
          MathEvaluator.evaluate(expression, midpoint);
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

      return (left.derivativeAtPoint ?? Number.POSITIVE_INFINITY) - (right.derivativeAtPoint ?? Number.POSITIVE_INFINITY);
    });
  }

  /**
   * Selecciona la mejor transformación convergente disponible para punto fijo.
   */
  static selectFixedPointTransformation(
    f: string,
    referencePoint: number,
    interval?: { a?: number; b?: number },
  ): { selected: FixedPointCandidate | null; candidates: FixedPointCandidate[] } {
    const candidates = this.generateFixedPointCandidates(f, referencePoint, interval);
    const selected = candidates.find((candidate) => candidate.convergent) ?? null;
    return { selected, candidates };
  }

  /**
   * Resuelve una ecuación por bisección.
   */
  static bisection(f: string, a: number, b: number, tol: number, maxIter: number): CalculationResult {
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

    let xrOld: number | null = null;
    let xr = a;
    let converged = false;

    for (let iteration = 1; iteration <= maxIter; iteration += 1) {
      xrOld = xr;
      xr = (a + b) / 2;
      const fxr = MathEvaluator.evaluate(f, xr);
      const ea = iteration === 1 ? Math.abs(b - a) / 2 : Math.abs(xr - (xrOld as number));
      const er = xr !== 0 ? (ea / Math.abs(xr)) * 100 : 0;

      iterations.push({
        iteration,
        a,
        b,
        xr,
        fa,
        fb,
        fxr,
        ea,
        er: `${er.toFixed(6)}%`,
      });

      if (Math.abs(fxr) < 1e-15 || (iteration > 1 && ea <= tol)) {
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

  /**
   * Resuelve una ecuación por regla falsa.
   */
  static falsePosition(f: string, a: number, b: number, tol: number, maxIter: number): CalculationResult {
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

    let xrOld: number | null = null;
    let xr = a;
    let converged = false;

    for (let iteration = 1; iteration <= maxIter; iteration += 1) {
      xrOld = xr;
      xr = b - (fb * (a - b)) / (fa - fb);
      const fxr = MathEvaluator.evaluate(f, xr);
      const { ea, er } = this.calculateError(xr, iteration === 1 ? null : xrOld);

      iterations.push({
        iteration,
        a,
        b,
        xr,
        fa,
        fb,
        fxr,
        ea,
        er: `${er.toFixed(6)}%`,
      });

      if (Math.abs(fxr) < 1e-15 || (iteration > 1 && ea <= tol)) {
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

  /**
   * Resuelve una ecuación por Newton-Raphson.
   */
  static newtonRaphson(f: string, x0: number, tol: number, maxIter: number): CalculationResult {
    const iterations: IterationData[] = [];
    let xi = x0;
    let converged = false;

    for (let iteration = 1; iteration <= maxIter; iteration += 1) {
      const fxi = MathEvaluator.evaluate(f, xi);
      const derivative = MathEvaluator.derivative(f, xi);

      if (Math.abs(derivative) < 1e-12) {
        return this.errorResult('newton-raphson', f, 'Derivada cercana a cero', { x0, tol, maxIter });
      }

      const xiNext = xi - fxi / derivative;
      const fxiNext = MathEvaluator.evaluate(f, xiNext);
      const { ea, er } = this.calculateError(xiNext, xi);

      iterations.push({
        iteration,
        xi,
        fxi,
        df: derivative,
        xiNext,
        ea,
        er: `${er.toFixed(6)}%`,
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

  /**
   * Resuelve una ecuación por secante.
   */
  static secant(f: string, x0: number, x1: number, tol: number, maxIter: number): CalculationResult {
    const iterations: IterationData[] = [];
    let xiPrevious = x0;
    let xi = x1;
    let converged = false;

    for (let iteration = 1; iteration <= maxIter; iteration += 1) {
      const fxiPrevious = MathEvaluator.evaluate(f, xiPrevious);
      const fxi = MathEvaluator.evaluate(f, xi);
      const denominator = fxi - fxiPrevious;

      if (Math.abs(denominator) < Number.EPSILON * 10) {
        return this.errorResult(
          'secant',
          f,
          'f(x0) y f(x1) son iguales, la secante es horizontal',
          { x0, x1, tol, maxIter },
        );
      }

      const xiNext = xi - (fxi * (xi - xiPrevious)) / denominator;
      const fxiNext = MathEvaluator.evaluate(f, xiNext);
      const { ea, er } = this.calculateError(xiNext, xi);

      iterations.push({
        iteration,
        xi_prev: xiPrevious,
        xi,
        fxi_prev: fxiPrevious,
        fxi,
        xi_next: xiNext,
        ea,
        er: `${er.toFixed(6)}%`,
      });

      if (Math.abs(fxiNext) < 1e-15 || ea <= tol) {
        xi = xiNext;
        converged = true;
        break;
      }

      xiPrevious = xi;
      xi = xiNext;
    }

    return this.successResult('secant', f, xi, iterations, converged, { x0, x1, tol, maxIter });
  }

  /**
   * Wrapper compatible para punto fijo con selección automática de g(x).
   */
  static fixedPoint(
    f: string,
    x0: number,
    tol: number,
    maxIter: number,
    g1Value?: number,
    interval?: { a?: number; b?: number },
  ): CalculationResult {
    const referencePoint = g1Value !== undefined ? g1Value : x0;
    const { selected, candidates } = this.selectFixedPointTransformation(f, referencePoint, interval);

    if (!selected) {
      return this.errorResult(
        'fixed-point',
        f,
        'No se encontró una transformación g(x) convergente a partir de f(x)',
        { x0, tol, maxIter, g1Value, candidates },
      );
    }

    return this.fixedPointWithTransformation(f, selected.expression, x0, tol, maxIter, g1Value, candidates, selected.derivativeAtPoint);
  }

  /**
   * Resuelve una ecuación por punto fijo usando una transformación g(x) explícita.
   */
  static fixedPointWithTransformation(
    f: string,
    g: string,
    x0: number,
    tol: number,
    maxIter: number,
    g1Value?: number,
    candidates: FixedPointCandidate[] = [],
    selectedDerivative?: number | null,
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
      const derivative = MathEvaluator.derivative(g, referencePoint);
      if (Math.abs(derivative) >= 1) {
        params.candidates = [
          ...candidates,
          {
            expression: g,
            lambda: Number.NaN,
            derivativeAtPoint: Math.abs(derivative),
            convergent: false,
            reason: `|g'(x)| = ${Math.abs(derivative).toFixed(6)} >= 1`,
          },
        ];
      }
    } catch {
      // Se conserva el flujo sin abortar si la derivada de g no es evaluable.
    }

    for (let iteration = 1; iteration <= maxIter; iteration += 1) {
      let xiNext: number;
      let dgi: number | null = null;
      let fxi: number;
      let fxiNext: number;

      try {
        xiNext = MathEvaluator.evaluate(g, xi);
        fxi = MathEvaluator.evaluate(f, xi);
        fxiNext = MathEvaluator.evaluate(f, xiNext);
        try {
          dgi = MathEvaluator.derivative(g, xi);
        } catch {
          dgi = null;
        }
      } catch {
        return this.errorResult('fixed-point', f, 'Error evaluando g(x) o f(x)', params, g);
      }

      const { ea, er } = this.calculateError(xiNext, xi);
      iterations.push({
        iteration,
        xi,
        fxi,
        xiNext,
        dgi: dgi !== null ? dgi.toFixed(6) : 'N/A',
        ea,
        er: `${er.toFixed(6)}%`,
      });

      if (ea <= tol || Math.abs(fxiNext) < 1e-15) {
        xi = xiNext;
        converged = true;
        break;
      }

      xi = xiNext;
      if (!Number.isFinite(xi) || Math.abs(xi) > 1e15) {
        return this.errorResult('fixed-point', f, 'El método diverge', params, g);
      }
    }

    return this.successResult('fixed-point', f, xi, iterations, converged, params, g);
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
  static newtonRaphsonSystem2x2(
    f1: string,
    f2: string,
    x0: number,
    y0: number,
    tol: number,
    maxIter: number,
  ): SystemCalculationResult {
    return this.newtonRaphsonSystem([f1, f2], ['x', 'y'], [x0, y0], tol, maxIter);
  }

  private static calculateError(current: number, previous: number | null): { ea: number; er: number } {
    if (previous === null) {
      return { ea: 0, er: 0 };
    }

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
      }

      if (Math.abs(augmented[pivotRow][column]) <= pivotTolerance) {
        throw new Error('Jacobiana singular o casi singular; no hay solucion unica local en esta iteracion');
      }

      if (pivotRow !== column) {
        [augmented[column], augmented[pivotRow]] = [augmented[pivotRow], augmented[column]];
      }

      for (let row = column + 1; row < size; row += 1) {
        const factor = augmented[row][column] / augmented[column][column];
        for (let col = column; col <= size; col += 1) {
          augmented[row][col] -= factor * augmented[column][col];
        }
      }
    }

    const solution = new Array<number>(size).fill(0);
    for (let row = size - 1; row >= 0; row -= 1) {
      let sum = augmented[row][size];
      for (let col = row + 1; col < size; col += 1) {
        sum -= augmented[row][col] * solution[col];
      }

      solution[row] = sum / augmented[row][row];
      if (!Number.isFinite(solution[row])) {
        throw new Error('La correccion del sistema no es finita');
      }
    }

    return solution;
  }

  private static systemNErrorResult(
    message: string,
    params: Record<string, any>,
    functions: string[],
    variables: string[],
    iterations: SystemIterationData[] = [],
  ): SystemCalculationResult {
    return {
      functionF1: functions[0] ?? '',
      functionF2: functions[1] ?? '',
      functions,
      variables,
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
      params,
    };
  }

  private static successResult(
    method: MethodType,
    f: string,
    root: number,
    iterations: IterationData[],
    converged: boolean,
    params: any,
    g?: string,
  ): CalculationResult {
    const lastIteration = iterations[iterations.length - 1];
    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      method,
      functionF: f,
      functionG: g,
      root,
      error: typeof lastIteration?.ea === 'number' ? lastIteration.ea : null,
      iterations,
      converged,
      message: converged ? 'Convergencia alcanzada' : 'No se alcanzó la convergencia en el máximo de iteraciones',
      params,
    };
  }
}

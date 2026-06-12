export type IterativeLinearMethod = 'jacobi' | 'gauss-seidel';

export interface LinearIterationData {
  iteration: number;
  previousVector: number[];
  nextVector: number[];
  delta: number[];
  ea: number;
  er: string;
  residual: number;
}

export interface LinearSystemResult {
  method: IterativeLinearMethod;
  matrix: number[][];
  constants: number[];
  initialValues: number[];
  variables: string[];
  solution: number[] | null;
  iterations: LinearIterationData[];
  converged: boolean;
  message: string;
  params: Record<string, any>;
  diagonallyDominant: boolean;
}

export interface NewtonNode {
  x: number;
  y: number;
}

export interface NewtonInterpolationResult {
  nodes: NewtonNode[];
  table: Array<Array<number | null>>;
  coefficients: number[];
  polynomialExpression: string;
  evaluatedPoint: number | null;
  interpolatedValue: number | null;
  converged: boolean;
  message: string;
  params: Record<string, any>;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return 'N/D';
  if (Math.abs(value) < 1e-12) return '0';
  return Number(value.toFixed(10)).toString();
}

function residualNorm(matrix: number[][], constants: number[], vector: number[]): number {
  return matrix.reduce((maxResidual, row, rowIndex) => {
    const leftSide = row.reduce((sum, coefficient, columnIndex) => sum + coefficient * vector[columnIndex], 0);
    return Math.max(maxResidual, Math.abs(leftSide - constants[rowIndex]));
  }, 0);
}

function isDiagonallyDominant(matrix: number[][]): boolean {
  return matrix.every((row, rowIndex) => {
    const diagonal = Math.abs(row[rowIndex] ?? 0);
    const offDiagonal = row.reduce((sum, coefficient, columnIndex) => (
      columnIndex === rowIndex ? sum : sum + Math.abs(coefficient)
    ), 0);

    return diagonal >= offDiagonal;
  });
}

function buildLinearParams(
  method: IterativeLinearMethod,
  matrix: number[][],
  constants: number[],
  initialValues: number[],
  tol: number,
  maxIter: number,
) {
  return {
    method,
    matrix,
    constants,
    initialValues,
    tol,
    maxIter,
  };
}

function cloneVector(vector: number[]): number[] {
  return vector.slice();
}

/**
 * Implementa métodos iterativos lineales y el polinomio interpolante de Newton.
 */
export class AdvancedMethods {
  static solveIterativeLinearSystem(
    method: IterativeLinearMethod,
    matrix: number[][],
    constants: number[],
    initialValues: number[],
    tol: number,
    maxIter: number,
    variables: string[],
  ): LinearSystemResult {
    const size = matrix.length;
    const iterations: LinearIterationData[] = [];
    const params = buildLinearParams(method, matrix, constants, initialValues, tol, maxIter);

    if (size < 2 || constants.length !== size || initialValues.length !== size || variables.length !== size) {
      return {
        method,
        matrix,
        constants,
        initialValues,
        variables,
        solution: null,
        iterations,
        converged: false,
        message: 'El sistema debe ser cuadrado y tener al menos 2 variables.',
        params,
        diagonallyDominant: isDiagonallyDominant(matrix),
      };
    }

    for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
      if (Math.abs(matrix[rowIndex]?.[rowIndex] ?? 0) < 1e-14) {
        return {
          method,
          matrix,
          constants,
          initialValues,
          variables,
          solution: null,
          iterations,
          converged: false,
          message: `El pivote diagonal a${rowIndex + 1}${rowIndex + 1} es cero o demasiado pequeño.`,
          params,
          diagonallyDominant: isDiagonallyDominant(matrix),
        };
      }
    }

    let current = cloneVector(initialValues);
    let converged = false;

    for (let iteration = 1; iteration <= maxIter; iteration += 1) {
      const next = cloneVector(current);

      for (let row = 0; row < size; row += 1) {
        const diagonal = matrix[row][row];
        if (Math.abs(diagonal) < 1e-14) {
          return {
            method,
            matrix,
            constants,
            initialValues,
            variables,
            solution: null,
            iterations,
            converged: false,
            message: `El pivote diagonal a${row + 1}${row + 1} se volvió inestable.`,
            params,
            diagonallyDominant: isDiagonallyDominant(matrix),
          };
        }

        let sum = 0;
        for (let column = 0; column < size; column += 1) {
          if (column === row) continue;
          const source = method === 'gauss-seidel' && column < row ? next[column] : current[column];
          sum += matrix[row][column] * source;
        }

        next[row] = (constants[row] - sum) / diagonal;
      }

      const delta = next.map((value, index) => value - current[index]);
      const ea = Math.max(...delta.map((value) => Math.abs(value)));
      const denominator = Math.max(1, ...next.map((value) => Math.abs(value)));
      const er = (ea / denominator) * 100;
      const residual = residualNorm(matrix, constants, next);

      iterations.push({
        iteration,
        previousVector: cloneVector(current),
        nextVector: cloneVector(next),
        delta,
        ea,
        er: `${er.toFixed(6)}%`,
        residual,
      });

      current = next;
      if (ea <= tol || residual <= tol) {
        converged = true;
        break;
      }

      if (!current.every(Number.isFinite)) {
        return {
          method,
          matrix,
          constants,
          initialValues,
          variables,
          solution: null,
          iterations,
          converged: false,
          message: 'La iteración produjo valores no finitos.',
          params,
          diagonallyDominant: isDiagonallyDominant(matrix),
        };
      }
    }

    const message = converged
      ? method === 'jacobi'
        ? 'Convergencia alcanzada con Jacobi.'
        : 'Convergencia alcanzada con Gauss-Seidel.'
      : method === 'jacobi'
      ? 'No se alcanzó la convergencia con Jacobi en el máximo de iteraciones.'
      : 'No se alcanzó la convergencia con Gauss-Seidel en el máximo de iteraciones.';

    return {
      method,
      matrix,
      constants,
      initialValues,
      variables,
      solution: cloneVector(current),
      iterations,
      converged,
      message,
      params,
      diagonallyDominant: isDiagonallyDominant(matrix),
    };
  }

  static jacobi(
    matrix: number[][],
    constants: number[],
    initialValues: number[],
    tol: number,
    maxIter: number,
    variables: string[],
  ): LinearSystemResult {
    return this.solveIterativeLinearSystem('jacobi', matrix, constants, initialValues, tol, maxIter, variables);
  }

  static gaussSeidel(
    matrix: number[][],
    constants: number[],
    initialValues: number[],
    tol: number,
    maxIter: number,
    variables: string[],
  ): LinearSystemResult {
    return this.solveIterativeLinearSystem('gauss-seidel', matrix, constants, initialValues, tol, maxIter, variables);
  }

  static interpolateNewton(
    nodes: NewtonNode[],
    evaluatedPoint?: number,
  ): NewtonInterpolationResult {
    const params = {
      nodes,
      evaluatedPoint,
    };

    if (nodes.length < 2) {
      return {
        nodes,
        table: [],
        coefficients: [],
        polynomialExpression: '',
        evaluatedPoint: evaluatedPoint ?? null,
        interpolatedValue: null,
        converged: false,
        message: 'Debes ingresar al menos dos puntos.',
        params,
      };
    }

    const xs = nodes.map((node) => node.x);
    const uniqueXs = new Set(xs);
    if (uniqueXs.size !== xs.length) {
      return {
        nodes,
        table: [],
        coefficients: [],
        polynomialExpression: '',
        evaluatedPoint: evaluatedPoint ?? null,
        interpolatedValue: null,
        converged: false,
        message: 'No se permiten valores de x repetidos en la interpolación de Newton.',
        params,
      };
    }

    const size = nodes.length;
    const table: Array<Array<number | null>> = Array.from({ length: size }, () => Array.from({ length: size }, () => null));

    for (let row = 0; row < size; row += 1) {
      table[row][0] = nodes[row].y;
    }

    for (let order = 1; order < size; order += 1) {
      for (let row = 0; row < size - order; row += 1) {
        const denominator = nodes[row + order].x - nodes[row].x;
        if (Math.abs(denominator) < 1e-14) {
          return {
            nodes,
            table,
            coefficients: [],
            polynomialExpression: '',
            evaluatedPoint: evaluatedPoint ?? null,
            interpolatedValue: null,
            converged: false,
            message: 'Se detectó una división por cero en las diferencias divididas.',
            params,
          };
        }

        const numerator = (table[row + 1][order - 1] ?? 0) - (table[row][order - 1] ?? 0);
        table[row][order] = numerator / denominator;
      }
    }

    const coefficients = table[0].map((value) => value ?? 0).slice(0, size);
    const polynomialExpression = this.buildNewtonPolynomial(nodes, coefficients);
    const interpolatedValue =
      evaluatedPoint === undefined ? null : this.evaluateNewtonPolynomial(nodes, coefficients, evaluatedPoint);

    return {
      nodes,
      table,
      coefficients,
      polynomialExpression,
      evaluatedPoint: evaluatedPoint ?? null,
      interpolatedValue,
      converged: true,
      message: 'Polinomio de Newton construido correctamente.',
      params,
    };
  }

  static evaluateNewtonPolynomial(nodes: NewtonNode[], coefficients: number[], x: number): number {
    let value = coefficients[0] ?? 0;
    let factor = 1;

    for (let index = 1; index < coefficients.length; index += 1) {
      factor *= x - nodes[index - 1].x;
      value += (coefficients[index] ?? 0) * factor;
    }

    return value;
  }

  static buildNewtonPolynomial(nodes: NewtonNode[], coefficients: number[]): string {
    const terms: string[] = [];
    for (let index = 0; index < coefficients.length; index += 1) {
      const coefficient = coefficients[index] ?? 0;
      if (Math.abs(coefficient) < 1e-12) continue;

      if (index === 0) {
        terms.push(formatNumber(coefficient));
        continue;
      }

      const factors = nodes
        .slice(0, index)
        .map((node) => `(x - ${formatNumber(node.x)})`)
        .join(' ');

      const formattedCoefficient = formatNumber(Math.abs(coefficient));
      const prefix = coefficient < 0 ? '-' : '+';
      terms.push(`${prefix} ${formattedCoefficient}${factors ? ` ${factors}` : ''}`.trim());
    }

    return terms.length ? `P(x) = ${terms.join(' ')}` : 'P(x) = 0';
  }
}

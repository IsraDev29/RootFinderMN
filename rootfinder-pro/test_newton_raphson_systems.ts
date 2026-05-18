/**
 * Test exhaustivo del método Newton-Raphson para sistemas
 * Este archivo prueba varios casos para identificar errores
 */

import { NumericalMethods } from './src/lib/numericalMethods';

interface TestCase {
  name: string;
  functions: string[];
  variables: string[];
  initialValues: number[];
  tol: number;
  maxIter: number;
  expectedSolution?: Record<string, number>;
  shouldConverge?: boolean;
  description?: string;
}

const testCases: TestCase[] = [
  {
    name: 'Sistema 2x2 simple: x^2 + y^2 = 4, x - y = 1',
    functions: ['x^2 + y^2 - 4', 'x - y - 1'],
    variables: ['x', 'y'],
    initialValues: [1.5, 0.5],
    tol: 1e-6,
    maxIter: 20,
    expectedSolution: { x: 1.8228756555322952, y: 0.8228756555322952 },
    shouldConverge: true,
    description: 'Sistema no lineal clásico con dos soluciones reales',
  },
  {
    name: 'Sistema 3x3: x^2 = 4, y^2 = 9, z^2 = 16',
    functions: ['x^2 - 4', 'y^2 - 9', 'z^2 - 16'],
    variables: ['x', 'y', 'z'],
    initialValues: [1.5, 2.5, 3.5],
    tol: 1e-8,
    maxIter: 30,
    expectedSolution: { x: 2, y: 3, z: 4 },
    shouldConverge: true,
    description: 'Sistema con raíces exactas conocidas',
  },
  {
    name: 'Sistema lineal: x + y = 3, 2x - y = 0',
    functions: ['x + y - 3', '2*x - y'],
    variables: ['x', 'y'],
    initialValues: [1, 1],
    tol: 1e-8,
    maxIter: 20,
    expectedSolution: { x: 1, y: 2 },
    shouldConverge: true,
    description: 'Sistema lineal que Newton-Raphson debe resolver en 1-2 iteraciones',
  },
  {
    name: 'Sistema singular: x + y = 2, 2x + 2y = 4',
    functions: ['x + y - 2', '2*x + 2*y - 4'],
    variables: ['x', 'y'],
    initialValues: [1, 1],
    tol: 1e-8,
    maxIter: 5,
    shouldConverge: false,
    description: 'Sistema con infinitas soluciones (Jacobiana singular)',
  },
  {
    name: 'Sistema con variables cercanas: x = 0.1, y = 0.1',
    functions: ['x^2 - 0.01', 'y^2 - 0.01'],
    variables: ['x', 'y'],
    initialValues: [0.05, 0.05],
    tol: 1e-8,
    maxIter: 20,
    expectedSolution: { x: 0.1, y: 0.1 },
    shouldConverge: true,
    description: 'Sistema con valores numéricos pequeños',
  },
  {
    name: 'Sistema con valores grandes: x = 100, y = 200',
    functions: ['x^2 - 10000', 'y^2 - 40000'],
    variables: ['x', 'y'],
    initialValues: [50, 100],
    tol: 1e-6,
    maxIter: 20,
    expectedSolution: { x: 100, y: 200 },
    shouldConverge: true,
    description: 'Sistema con valores numéricos grandes',
  },
  {
    name: 'Sistema no lineal acoplado: sin(x) + y = 1, x + cos(y) = 1',
    functions: ['sin(x) + y - 1', 'x + cos(y) - 1'],
    variables: ['x', 'y'],
    initialValues: [0.5, 0.5],
    tol: 1e-8,
    maxIter: 30,
    description: 'Sistema trascendental con acoplamiento fuerte',
  },
  {
    name: 'Sistema 4x4: ecuaciones de círculos',
    functions: [
      'x^2 + y^2 - 4',
      'z^2 + w^2 - 9',
      'x - z',
      'y - w',
    ],
    variables: ['x', 'y', 'z', 'w'],
    initialValues: [1, 1, 1, 1],
    tol: 1e-6,
    maxIter: 30,
    description: 'Sistema 4x4 con restricciones geométricas',
  },
  {
    name: 'Sistema con pendiente negativa: -x - y = -3, x - 2y = -1',
    functions: ['-x - y + 3', 'x - 2*y + 1'],
    variables: ['x', 'y'],
    initialValues: [2, 0],
    tol: 1e-8,
    maxIter: 20,
    expectedSolution: { x: 1.4, y: 1.2 },
    shouldConverge: true,
    description: 'Sistema con coeficientes negativos',
  },
  {
    name: 'Sistema mal condicionado: 100x + y = 101, x + y = 2',
    functions: ['100*x + y - 101', 'x + y - 2'],
    variables: ['x', 'y'],
    initialValues: [1, 1],
    tol: 1e-6,
    maxIter: 20,
    description: 'Sistema numéricamente mal condicionado',
  },
];

function runTest(testCase: TestCase): void {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`PRUEBA: ${testCase.name}`);
  console.log(`${'='.repeat(80)}`);
  
  if (testCase.description) {
    console.log(`Descripción: ${testCase.description}`);
  }
  
  console.log(`\nEcuaciones: ${testCase.functions.map((f, i) => `F${i + 1}: ${f}`).join(', ')}`);
  console.log(`Variables: ${testCase.variables.join(', ')}`);
  console.log(`Valores iniciales: ${testCase.initialValues.join(', ')}`);
  console.log(`Tolerancia: ${testCase.tol}, Máx iteraciones: ${testCase.maxIter}`);

  try {
    const result = NumericalMethods.newtonRaphsonSystem(
      testCase.functions,
      testCase.variables,
      testCase.initialValues,
      testCase.tol,
      testCase.maxIter,
    );

    console.log(`\n--- RESULTADO ---`);
    console.log(`Convergió: ${result.converged}`);
    console.log(`Mensaje: ${result.message}`);

    if (result.solution) {
      console.log(`\nSolución encontrada:`);
      testCase.variables.forEach((variable, index) => {
        const value = result.solution![variable];
        console.log(`  ${variable} = ${value}`);

        if (testCase.expectedSolution && testCase.expectedSolution[variable] !== undefined) {
          const expected = testCase.expectedSolution[variable];
          const error = Math.abs(value - expected);
          console.log(`    Esperado: ${expected}, Error: ${error.toExponential(6)}`);
        }
      });
    } else {
      console.log(`NO HAY SOLUCIÓN`);
    }

    console.log(`\nError final (ea): ${result.error}`);
    console.log(`Iteraciones totales: ${result.iterations.length}`);

    if (result.iterations.length > 0) {
      const lastIter = result.iterations[result.iterations.length - 1];
      console.log(`\nÚltima iteración:`);
      console.log(`  Iteración #: ${lastIter.iteration}`);
      console.log(`  Vector: [${lastIter.nextVector?.join(', ')}]`);
      console.log(`  F valores: [${lastIter.fValues?.map((v) => v.toExponential(6)).join(', ')}]`);
      console.log(`  Error absoluto (ea): ${lastIter.ea}`);
      console.log(`  Error relativo (er): ${lastIter.er}`);
    }

    if (result.iterations.length <= 5) {
      console.log(`\nTodas las iteraciones:`);
      result.iterations.forEach((iter) => {
        console.log(`  Iter ${iter.iteration}: ea=${iter.ea.toExponential(6)}, er=${iter.er}`);
      });
    }

    // Verificación
    console.log(`\n--- VERIFICACIÓN ---`);
    if (testCase.shouldConverge !== undefined) {
      if (result.converged === testCase.shouldConverge) {
        console.log(`✓ CORRECTO: Convergencia esperada: ${testCase.shouldConverge}, Obtenida: ${result.converged}`);
      } else {
        console.log(`✗ ERROR: Convergencia esperada: ${testCase.shouldConverge}, Obtenida: ${result.converged}`);
      }
    }

    if (testCase.expectedSolution && result.solution) {
      let allClose = true;
      testCase.variables.forEach((variable) => {
        const expected = testCase.expectedSolution![variable];
        const actual = result.solution![variable];
        if (expected !== undefined && actual !== undefined) {
          const error = Math.abs(actual - expected);
          const closeEnough = error < 1e-4;
          if (!closeEnough) allClose = false;
          const status = closeEnough ? '✓' : '✗';
          console.log(`${status} ${variable}: error = ${error.toExponential(6)}`);
        }
      });
      if (allClose) {
        console.log(`✓ Todas las variables dentro de tolerancia`);
      } else {
        console.log(`✗ Algunas variables fuera de tolerancia`);
      }
    }
  } catch (error) {
    console.log(`\n✗ EXCEPCIÓN LANZADA:`);
    console.log(`${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log('\n\n');
console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                                                                               ║');
console.log('║           PRUEBAS EXHAUSTIVAS - NEWTON-RAPHSON PARA SISTEMAS                ║');
console.log('║                                                                               ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');

for (const testCase of testCases) {
  runTest(testCase);
}

console.log(`\n\n${'='.repeat(80)}`);
console.log('RESUMEN: Revisa los resultados arriba para identificar errores');
console.log(`${'='.repeat(80)}\n`);

import test from 'node:test';
import assert from 'node:assert/strict';
import { AdvancedMethods } from '../src/lib/advancedMethods';

test('Jacobi converge para un sistema diagonalmente dominante', () => {
  const result = AdvancedMethods.jacobi(
    [
      [10, 1, 1],
      [2, 10, 1],
      [2, 2, 10],
    ],
    [12, 13, 14],
    [0, 0, 0],
    1e-8,
    50,
    ['x', 'y', 'z'],
  );

  assert.equal(result.converged, true);
  assert.ok(result.solution !== null);
  assert.ok(Math.abs(result.solution![0] - 1) < 1e-6);
  assert.ok(Math.abs(result.solution![1] - 1) < 1e-6);
  assert.ok(Math.abs(result.solution![2] - 1) < 1e-6);
});

test('Gauss-Seidel converge para el mismo sistema con menos o igual iteraciones', () => {
  const result = AdvancedMethods.gaussSeidel(
    [
      [10, 1, 1],
      [2, 10, 1],
      [2, 2, 10],
    ],
    [12, 13, 14],
    [0, 0, 0],
    1e-8,
    50,
    ['x', 'y', 'z'],
  );

  assert.equal(result.converged, true);
  assert.ok(result.solution !== null);
  assert.ok(Math.abs(result.solution![0] - 1) < 1e-6);
  assert.ok(Math.abs(result.solution![1] - 1) < 1e-6);
  assert.ok(Math.abs(result.solution![2] - 1) < 1e-6);
});

test('Newton interpolacion construye el polinomio y evalua el punto objetivo', () => {
  const result = AdvancedMethods.interpolateNewton(
    [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 5 },
    ],
    1.5,
  );

  assert.equal(result.converged, true);
  assert.match(result.polynomialExpression, /P\(x\)/);
  assert.ok(Math.abs((result.interpolatedValue ?? 0) - 3.25) < 1e-6);
  assert.equal(result.table[0][0], 1);
  assert.equal(result.table[0][1], 1);
  assert.equal(result.table[0][2], 1);
});

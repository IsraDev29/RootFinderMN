import test from 'node:test';
import assert from 'node:assert/strict';
import { NumericalMethods } from '../src/lib/numericalMethods';

test('Biseccion detecta una raiz exacta en el extremo del intervalo', () => {
  const result = NumericalMethods.bisection('x^2 - 4', 2, 5, 1e-6, 50);
  assert.equal(result.converged, true);
  assert.equal(result.root, 2);
  assert.equal(result.iterations.length, 0);
});

test('Regla falsa detecta una raiz exacta en el extremo del intervalo', () => {
  const result = NumericalMethods.falsePosition('x^2 - 4', -5, -2, 1e-6, 50);
  assert.equal(result.converged, true);
  assert.equal(result.root, -2);
  assert.equal(result.iterations.length, 0);
});

test('Newton-Raphson converge para una funcion suave', () => {
  const result = NumericalMethods.newtonRaphson('x^2 - 2', 1, 1e-8, 20);
  assert.equal(result.converged, true);
  assert.ok(result.root !== null);
  assert.ok(Math.abs(result.root! - Math.SQRT2) < 1e-6);
});

test('Newton-Raphson para sistema acepta ecuaciones con equality', () => {
  const result = NumericalMethods.newtonRaphsonSystem2x2('x^2 + y^2 = 4', 'x - y = 1', 1.5, 0.5, 1e-6, 20);
  assert.equal(result.converged, true);
  assert.ok(result.solution !== null);
  assert.ok(Math.abs(result.solution!.x - 1.8228756555) < 1e-6);
  assert.ok(Math.abs(result.solution!.y - 0.8228756555) < 1e-6);
});
<<<<<<< Updated upstream
=======

test('Newton-Raphson para sistema resuelve sistemas n x n', () => {
  const result = NumericalMethods.newtonRaphsonSystem(
    ['x^2 - 4', 'y^2 - 9', 'z^2 - 16'],
    ['x', 'y', 'z'],
    [1.5, 2.5, 3.5],
    1e-8,
    30,
  );

  assert.equal(result.converged, true);
  assert.ok(result.solution !== null);
  assert.ok(Math.abs(result.solution!.values[0] - 2) < 1e-6);
  assert.ok(Math.abs(result.solution!.values[1] - 3) < 1e-6);
  assert.ok(Math.abs(result.solution!.values[2] - 4) < 1e-6);
});

test('Newton-Raphson para sistema detecta Jacobiana singular', () => {
  const result = NumericalMethods.newtonRaphsonSystem(
    ['x + y - 2', '2*x + 2*y - 4'],
    ['x', 'y'],
    [1, 1],
    1e-8,
    5,
  );

  assert.equal(result.converged, false);
  assert.match(result.message, /Jacobiana singular/);
});

test('Punto fijo acepta transformaciones con |g\'(x)| menor que 1 sin margen artificial', () => {
  const candidates = NumericalMethods.generateFixedPointCandidates('-0.04*x + 1', 0, { a: 0, b: 2 });
  const candidate = candidates.find((item) => item.expression === 'x + (0.25) * (-0.04*x + 1)');

  if (!candidate) {
    assert.fail('No se encontró la candidata esperada para |g\'(x)| = 0.99');
  }

  assert.equal(candidate.derivativeAtPoint, 0.99);
  assert.equal(candidate.convergent, true);
});

test('Punto fijo valida la raiz en x(i+1) antes de declarar convergencia', () => {
  const result = NumericalMethods.fixedPointWithTransformation('x', 'x + 1', 0, 1e-6, 5);

  assert.equal(result.converged, false);
  assert.equal(result.root, 5);
  assert.equal(result.message, 'No se alcanzó la convergencia en el máximo de iteraciones');
});

test('Secante detecta una secante horizontal antes de dividir', () => {
  const result = NumericalMethods.secant('x^2', 1, -1, 1e-8, 10);
  assert.equal(result.converged, false);
  assert.match(result.message, /secante es horizontal/i);
});

test('Richardson mejora una derivada central para sin(x)', () => {
  const result = NumericalMethods.richardson('sin(x)', 1, 0.5, 6, 1, 'central', 1e-8);

  assert.ok(result.root !== null);
  assert.ok(Math.abs(result.root - Math.cos(1)) < 1e-8);
  assert.equal(result.iterations.length, 6);
});

test('Romberg integra funciones suaves con alta precision', () => {
  const result = NumericalMethods.romberg('sin(x)', 0, Math.PI, 1e-10, 10);

  assert.equal(result.converged, true);
  assert.ok(result.root !== null);
  assert.ok(Math.abs(result.root - 2) < 1e-10);
});

test('Newton-Raphson para sistema detecta estancamiento o convergencia lenta', () => {
  const result = NumericalMethods.newtonRaphsonSystem(
    ['x^2 + y^2 - 1', 'x^2 - y'],
    ['x', 'y'],
    [0.7, 0.6],
    1e-14,
    12,
  );

  assert.equal(result.iterations.length > 0, true);
  assert.match(result.message, /Convergencia alcanzada|Advertencia: posible estancamiento|No se alcanzo/);
});
>>>>>>> Stashed changes

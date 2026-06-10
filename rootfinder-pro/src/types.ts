<<<<<<< Updated upstream
export type MethodType = 'bisection' | 'false-position' | 'newton-raphson' | 'secant' | 'fixed-point';
=======
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type MethodType =
  | 'bisection'
  | 'false-position'
  | 'newton-raphson'
  | 'secant'
  | 'fixed-point'
  | 'richardson'
  | 'romberg';
export type PolynomialMethodType = 'horner' | 'bairstow' | 'muller';
export type HistoryModule = 'resolution' | 'polynomial' | 'systems' | 'taylor';
>>>>>>> Stashed changes

export type AppTab =
  | 'verification'
  | 'taylor'
  | 'methods'
  | 'polynomial'
  | 'results'
  | 'history'
  | 'graph'
  | 'systems'
  | 'calculo';  

export type AppAccessTab = 'verification' | 'taylor' | 'methods' | 'polynomial';

export interface FixedPointCandidate {
  expression: string;
  lambda: number;
  derivativeAtPoint: number | null;
  convergent: boolean;
  reason: string;
}

export interface IterationData {
  iteration: number;
  [key: string]: number | string;
}

export interface CalculationResult {
  id: string;
  timestamp: number;
  method: MethodType;
  functionF: string;
  functionG?: string;
  root: number | null;
  error: number | null;
  iterations: IterationData[];
  converged: boolean;
  message: string;
  params: Record<string, any>;
  label?: string;
}

export interface SystemIterationData {
  iteration: number;
  x: number;
  y: number;
  f1: number;
  f2: number;
  j11: number;
  j12: number;
  j21: number;
  j22: number;
  deltaX: number;
  deltaY: number;
  xNext: number;
  yNext: number;
  ea: number;
  er: string;
}

export interface SystemCalculationResult {
  functionF1: string;
  functionF2: string;
  solution: { x: number; y: number } | null;
  error: number | null;
  iterations: SystemIterationData[];
  converged: boolean;
  message: string;
  params: Record<string, any>;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  method: MethodType;
  functionF: string;
  root: number | null;
  converged: boolean;
}

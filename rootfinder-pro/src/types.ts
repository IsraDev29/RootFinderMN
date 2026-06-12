export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type MethodType = 'bisection' | 'false-position' | 'newton-raphson' | 'secant' | 'fixed-point';
export type PolynomialMethodType = 'horner' | 'bairstow' | 'muller';
export type HistoryModule = 'resolution' | 'polynomial' | 'systems' | 'taylor';

export type AppTab =
  | 'taylor'
  | 'methods'
  | 'polynomial'
  | 'advanced'
  | 'results'
  | 'history'
  | 'graph'
  | 'systems';

export type AppAccessTab = 'taylor' | 'methods' | 'polynomial' | 'advanced';
export type AppTheme = 'dark';

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
  functionG?: string | null;
  root: number | null;
  error: number | null;
  iterations: IterationData[];
  converged: boolean;
  message: string;
  params: Record<string, any>;
  label?: string | null;
  updatedAt?: number;
}

export interface SystemIterationData {
  iteration: number;
  vector?: number[];
  fValues?: number[];
  jacobian?: number[][];
  delta?: number[];
  nextVector?: number[];
  ea: number;
  er: string;
  [key: string]: number | string | number[] | number[][] | undefined;
}

export interface SystemCalculationResult {
  functionF1: string;
  functionF2: string;
  functions: string[];
  variables: string[];
  solution:
    | ({
        x?: number;
        y?: number;
        values: number[];
        [key: string]: number | number[] | undefined;
      })
    | null;
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

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  verified: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyEmailInput {
  email: string;
  code: string;
}

export interface UpdateProfileInput {
  username?: string;
  email?: string;
}

export interface AuthSuccessResponse {
  token: string;
  accessToken: string;
  user: AuthUser;
}

export interface AuthVerificationRequiredResponse {
  requiresVerification: true;
  email: string;
  emailSent: boolean;
  verificationCode?: string | null;
  emailError?: string | null;
  error: string;
}

export interface RegisterResponse {
  message: string;
  requiresVerification: true;
  email: string;
  emailSent: boolean;
  verificationCode?: string | null;
  emailError?: string | null;
  warning?: string | null;
  user: AuthUser;
}

export interface CurrentUserResponse {
  user: AuthUser;
}

export interface LogoutResponse {
  success: boolean;
}

export interface HistoryMutationResponse {
  success: boolean;
  item: CalculationResult;
}

export interface ApiErrorPayload {
  error: string;
  code?: string;
  details?: string;
}

export interface ApiHealthResponse {
  status: 'ok' | 'degraded' | 'error';
  storage: 'postgres' | 'json';
  dbLatencyMs: number;
  uptime: number;
  memoryMB: number;
  timestamp: string;
}

export interface QueuedHistoryOperation {
  id: string;
  type: 'save' | 'delete' | 'clear' | 'updateLabel';
  payload?: CalculationResult | { id: string; label: string };
  createdAt: number;
}

export interface HistoryCacheSnapshot {
  version: 1;
  userId: string;
  items: CalculationResult[];
  queuedOperations: QueuedHistoryOperation[];
  cachedAt: number;
}

export type HistorySyncStatus = 'idle' | 'loading' | 'synced' | 'offline' | 'syncing' | 'error';

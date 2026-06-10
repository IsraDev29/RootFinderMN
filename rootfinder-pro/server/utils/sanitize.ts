import type { CalculationRecord, JsonObject, JsonValue } from "../types.js";

export const ALLOWED_METHODS = new Set([
  "bisection",
  "false-position",
  "newton-raphson",
  "secant",
  "fixed-point",
  "richardson",
  "romberg",
  "muller",
  "bairstow",
  "horner",
  "taylor",
  "newton-raphson-system",
]);

const SEQUENTIAL_PATTERNS = /(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210)/;

/**
 * Elimina etiquetas HTML, caracteres de control y exceso de longitud.
 */
export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Normaliza emails para comparaciones y persistencia.
 */
export function sanitizeEmail(value: unknown): string {
  return sanitizeText(value, 100).toLowerCase();
}

/**
 * Normaliza nombres de usuario conservando la convención permitida.
 */
export function sanitizeUsername(value: unknown): string {
  return sanitizeText(value, 40)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_.-]/g, "")
    .slice(0, 40);
}

/**
 * Convierte un valor a número finito o `null` cuando no es válido.
 */
export function sanitizeNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Detecta secuencias consecutivas de cuatro dígitos en contraseñas.
 */
export function hasSequentialDigits(password: string): boolean {
  const digitsOnly = password.replace(/\D/g, "");
  return SEQUENTIAL_PATTERNS.test(digitsOnly);
}

/**
 * Convierte un valor arbitrario a una estructura JSON segura.
 */
export function sanitizeJsonValue(value: unknown, depth = 0): JsonValue {
  if (depth > 4) {
    return null;
  }

  if (typeof value === "string") {
    return sanitizeText(value, 2000);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "boolean" || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 500).map((entry) => sanitizeJsonValue(entry, depth + 1));
  }

  if (value && typeof value === "object") {
    const sanitized: JsonObject = {};

    for (const [key, entry] of Object.entries(value)) {
      const safeKey = sanitizeText(key, 80);
      if (!safeKey) {
        continue;
      }

      sanitized[safeKey] = sanitizeJsonValue(entry, depth + 1);
    }

    return sanitized;
  }

  return null;
}

/**
 * Normaliza un objeto JSON plano para uso en parámetros e iteraciones.
 */
export function sanitizeJsonRecord(value: unknown): JsonObject {
  const sanitized = sanitizeJsonValue(value);
  return sanitized && !Array.isArray(sanitized) && typeof sanitized === "object" ? sanitized : {};
}

/**
 * Normaliza la lista de iteraciones y limita su tamaño.
 */
export function sanitizeIterations(value: unknown): JsonObject[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, 500).map((entry) => sanitizeJsonRecord(entry));
}

/**
 * Sanitiza y normaliza el payload de un cálculo antes de persistirlo.
 */
export function sanitizeCalculationPayload(input: unknown): CalculationRecord {
  if (!input || typeof input !== "object") {
    throw new Error("Payload inválido");
  }

  const raw = input as Record<string, unknown>;
  const method = sanitizeText(raw.method, 40);
  if (!ALLOWED_METHODS.has(method)) {
    throw new Error(`Método inválido: ${method}`);
  }

  const functionF = sanitizeText(raw.functionF ?? raw.functionF1 ?? raw.fx, 2000);
  if (!functionF) {
    throw new Error("La función principal es requerida");
  }

  return {
    id: sanitizeText(raw.id, 80),
    timestamp: Number.isFinite(Number(raw.timestamp)) ? Number(raw.timestamp) : Date.now(),
    method,
    functionF,
    functionG: sanitizeText(raw.functionG ?? raw.functionF2, 2000) || null,
    root:
      raw.root === null || raw.root === undefined
        ? sanitizeNumber((raw.solution as Record<string, unknown> | undefined)?.x ?? null)
        : sanitizeNumber(raw.root),
    error: raw.error === null || raw.error === undefined ? null : sanitizeNumber(raw.error),
    iterations: sanitizeIterations(raw.iterations),
    converged: Boolean(raw.converged),
    message: sanitizeText(raw.message, 1200),
    params: sanitizeJsonRecord(raw.params),
    label: sanitizeText(raw.label, 200) || null,
    updatedAt: Date.now(),
  };
}

/**
 * Normaliza direcciones IP para logging y persistencia.
 */
export function sanitizeIpAddress(value: unknown): string | null {
  const normalized = sanitizeText(value, 120);
  return normalized || null;
}


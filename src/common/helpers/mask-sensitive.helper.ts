/**
 * Single source of truth for which request-body fields must never reach a log.
 *
 * Two consumers share it so a new credential field is covered everywhere at
 * once: the pino request serializer (src/app.module.ts) and AllExceptionsFilter.
 * When you add an endpoint that accepts a new secret, add its field name here
 * and its dotted path to `redact.paths` in app.module.ts.
 */
export const SENSITIVE_FIELDS = [
  'password',
  'currentPassword',
  'newPassword',
  'currentPass',
  'newPass',
  'pin',
  'refreshToken',
];

export const REDACTED = '[Redacted]';

// Bulk DTOs nest credentials one level down (an array of employees each with a
// pin, say), so masking only the top level would still leak them. Depth is
// capped because deeply nested payloads are not worth unbounded recursion.
const MAX_MASK_DEPTH = 4;

function maskValue(value: unknown, depth: number): unknown {
  if (depth > MAX_MASK_DEPTH || !value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => maskValue(item, depth + 1));

  const masked: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  for (const [key, val] of Object.entries(masked)) {
    masked[key] = SENSITIVE_FIELDS.includes(key) ? REDACTED : maskValue(val, depth + 1);
  }
  return masked;
}

/**
 * Returns a copy of `body` with every sensitive field replaced by `[Redacted]`.
 * Non-object bodies are returned untouched.
 */
export function maskSensitive<T>(body: T): T {
  if (!body || typeof body !== 'object') return body;
  return maskValue(body, 0) as T;
}

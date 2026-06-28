const SENSITIVE_KEY =
  /(token|secret|authorization|hmac|password|cookie|api[-_]?key|email|phone)/i;
const MASK = '[REDACTED]';

/**
 * Deep-redact các field nhạy cảm trước khi log (task 4.3, spec.md §5):
 * access token, session JWT, app secret, HMAC, Authorization, PII (email/phone).
 */
export function redact<T>(value: T, seen = new WeakSet<object>()): T {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? MASK : redact(val, seen);
    }
    return out as T;
  }
  return value;
}

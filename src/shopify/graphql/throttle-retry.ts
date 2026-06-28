/** Phát hiện lỗi THROTTLED / 429 từ Admin API (cost-based rate limit). */
export function isThrottleError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const e = error as {
    code?: number;
    statusCode?: number;
    message?: unknown;
    response?: { code?: number };
    body?: { errors?: Array<{ extensions?: { code?: string } }> };
    extensions?: { code?: string };
  };

  if (e.response?.code === 429 || e.code === 429 || e.statusCode === 429) {
    return true;
  }
  if (/throttl/i.test(String(e.message ?? ''))) {
    return true;
  }
  const extCode = e.body?.errors?.[0]?.extensions?.code ?? e.extensions?.code;
  return extCode === 'THROTTLED';
}

export interface ThrottleRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Bọc lời gọi Admin API, retry khi THROTTLED/429 với exponential backoff
 * (task 4.4). Lỗi khác → ném ngay. Hết retry → ném lỗi cuối.
 */
export async function withThrottleRetry<T>(
  fn: () => Promise<T>,
  options: ThrottleRetryOptions = {},
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 500, sleep = defaultSleep } = options;
  let attempt = 0;

  for (;;) {
    try {
      return await fn();
    } catch (error) {
      if (!isThrottleError(error) || attempt >= maxRetries) {
        throw error;
      }
      await sleep(baseDelayMs * 2 ** attempt);
      attempt += 1;
    }
  }
}

import { isThrottleError, withThrottleRetry } from './throttle-retry';

const noSleep = async (): Promise<void> => undefined;

describe('throttle-retry (task 4.4)', () => {
  describe('isThrottleError', () => {
    it('detects throttle signals', () => {
      expect(isThrottleError({ message: 'Throttled' })).toBe(true);
      expect(isThrottleError({ response: { code: 429 } })).toBe(true);
      expect(isThrottleError({ statusCode: 429 })).toBe(true);
      expect(
        isThrottleError({
          body: { errors: [{ extensions: { code: 'THROTTLED' } }] },
        }),
      ).toBe(true);
    });

    it('ignores non-throttle errors', () => {
      expect(isThrottleError({ message: 'boom' })).toBe(false);
      expect(isThrottleError(null)).toBe(false);
    });
  });

  it('retries a throttled call then succeeds', async () => {
    let calls = 0;
    const fn = jest.fn().mockImplementation(async () => {
      calls += 1;
      if (calls < 3) {
        throw { message: 'Throttled' };
      }
      return 'ok';
    });

    const result = await withThrottleRetry(fn, {
      sleep: noSleep,
      baseDelayMs: 1,
    });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('rethrows non-throttle errors immediately', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('boom'));
    await expect(withThrottleRetry(fn, { sleep: noSleep })).rejects.toThrow(
      'boom',
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('gives up after maxRetries', async () => {
    const fn = jest.fn().mockRejectedValue({ message: 'Throttled' });
    await expect(
      withThrottleRetry(fn, { sleep: noSleep, maxRetries: 2, baseDelayMs: 1 }),
    ).rejects.toBeDefined();
    expect(fn).toHaveBeenCalledTimes(3); // 1 lần đầu + 2 retry
  });
});

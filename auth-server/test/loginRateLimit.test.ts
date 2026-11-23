import { describe, expect, it } from 'vitest';
import { createLoginRateLimiter } from '../src/loginRateLimit';

describe('createLoginRateLimiter cleanup', () => {
  it('drops expired IP buckets so unused keys do not accumulate', () => {
    let now = 1_000;
    const limiter = createLoginRateLimiter({
      maxAttempts: 5,
      windowMs: 1_000,
      now: () => now,
    });

    limiter.recordFailure('10.0.0.1');
    limiter.recordFailure('10.0.0.2');
    limiter.recordFailure('10.0.0.3');
    expect(limiter.bucketCount()).toBe(3);

    now += 1_000;
    limiter.check('10.0.0.4');

    expect(limiter.bucketCount()).toBe(0);
  });

  it('still blocks within the active window after a sweep of other keys', () => {
    let now = 1_000;
    const limiter = createLoginRateLimiter({
      maxAttempts: 2,
      windowMs: 5_000,
      now: () => now,
    });

    limiter.recordFailure('stale');
    now += 5_000;
    limiter.recordFailure('active');
    limiter.recordFailure('active');

    expect(limiter.check('active')).toEqual({ blocked: true, retryAfterSec: expect.any(Number) });
    expect(limiter.bucketCount()).toBe(1);
  });
});

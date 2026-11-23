export interface RateLimitHit {
  blocked: true;
  retryAfterSec: number;
}

export interface RateLimitOk {
  blocked: false;
}

export type RateLimitCheck = RateLimitHit | RateLimitOk;

export interface LoginRateLimiter {
  check(key: string): RateLimitCheck;
  recordFailure(key: string): RateLimitCheck;
  recordSuccess(key: string): void;
}

export interface LoginRateLimitOptions {
  maxAttempts: number;
  windowMs: number;
  now?: () => number;
}

interface Bucket {
  failures: number;
  windowStart: number;
}

export function createLoginRateLimiter(options: LoginRateLimitOptions): LoginRateLimiter & {
  /** Exposed for tests: number of IP buckets still held in memory. */
  bucketCount(): number;
} {
  const now = options.now ?? Date.now;
  const buckets = new Map<string, Bucket>();

  function sweepExpired(at: number): void {
    for (const [key, bucket] of buckets) {
      if (at - bucket.windowStart >= options.windowMs) {
        buckets.delete(key);
      }
    }
  }

  function prune(key: string, at: number): Bucket | undefined {
    sweepExpired(at);
    const bucket = buckets.get(key);
    if (!bucket) return undefined;
    if (at - bucket.windowStart >= options.windowMs) {
      buckets.delete(key);
      return undefined;
    }
    return bucket;
  }

  function check(key: string): RateLimitCheck {
    const at = now();
    const bucket = prune(key, at);
    if (!bucket || bucket.failures < options.maxAttempts) return { blocked: false };
    const retryAfterSec = Math.max(1, Math.ceil((bucket.windowStart + options.windowMs - at) / 1000));
    return { blocked: true, retryAfterSec };
  }

  function recordFailure(key: string): RateLimitCheck {
    const at = now();
    let bucket = prune(key, at);
    if (!bucket) {
      bucket = { failures: 0, windowStart: at };
      buckets.set(key, bucket);
    }
    bucket.failures += 1;
    if (bucket.failures < options.maxAttempts) return { blocked: false };
    const retryAfterSec = Math.max(1, Math.ceil((bucket.windowStart + options.windowMs - at) / 1000));
    return { blocked: true, retryAfterSec };
  }

  function recordSuccess(key: string): void {
    sweepExpired(now());
    buckets.delete(key);
  }

  return {
    check,
    recordFailure,
    recordSuccess,
    bucketCount: () => buckets.size,
  };
}

export function clientKey(req: { ip?: string; socket?: { remoteAddress?: string } }): string {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

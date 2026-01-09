import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter, RATE_LIMIT_CONFIGS } from '../lib/rate-limiter';

describe('Rate Limiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 1000,
      keyPrefix: 'test',
    });
  });

  it('should allow requests under the limit', async () => {
    const result1 = await rateLimiter.checkLimit('user1');
    const result2 = await rateLimiter.checkLimit('user1');
    const result3 = await rateLimiter.checkLimit('user1');

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result3.allowed).toBe(true);
    expect(result3.remaining).toBe(2);
  });

  it('should block requests over the limit', async () => {
    for (let i = 0; i < 5; i++) {
      await rateLimiter.checkLimit('user1');
    }

    const result = await rateLimiter.checkLimit('user1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toContain('Rate limit exceeded');
  });

  it('should track different users separately', async () => {
    for (let i = 0; i < 5; i++) {
      await rateLimiter.checkLimit('user1');
    }

    const user2Result = await rateLimiter.checkLimit('user2');
    expect(user2Result.allowed).toBe(true);
  });

  it('should reset limit after reset is called', async () => {
    for (let i = 0; i < 5; i++) {
      await rateLimiter.checkLimit('user1');
    }

    await rateLimiter.resetLimit('user1');
    
    const result = await rateLimiter.checkLimit('user1');
    expect(result.allowed).toBe(true);
  });

  it('should provide remaining quota', async () => {
    await rateLimiter.checkLimit('user1');
    await rateLimiter.checkLimit('user1');

    const remaining = await rateLimiter.getRemainingQuota('user1');
    expect(remaining).toBe(3);
  });

  it('should reset after time window expires', async () => {
    for (let i = 0; i < 5; i++) {
      await rateLimiter.checkLimit('user1');
    }

    await new Promise(resolve => setTimeout(resolve, 1100));

    const result = await rateLimiter.checkLimit('user1');
    expect(result.allowed).toBe(true);
  });
});

describe('Rate Limit Configurations', () => {
  it('should have query execution rate limit', () => {
    expect(RATE_LIMIT_CONFIGS.QUERY_EXECUTION).toBeDefined();
    expect(RATE_LIMIT_CONFIGS.QUERY_EXECUTION.maxRequests).toBeGreaterThan(0);
  });

  it('should have stricter limits for sensitive operations', () => {
    expect(RATE_LIMIT_CONFIGS.PII_ACCESS.maxRequests).toBeLessThan(
      RATE_LIMIT_CONFIGS.QUERY_EXECUTION.maxRequests
    );
  });

  it('should have pipeline deploy rate limit', () => {
    expect(RATE_LIMIT_CONFIGS.PIPELINE_DEPLOY).toBeDefined();
    expect(RATE_LIMIT_CONFIGS.PIPELINE_DEPLOY.maxRequests).toBeLessThanOrEqual(5);
  });
});

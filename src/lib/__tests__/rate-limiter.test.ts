import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter, RATE_LIMIT_CONFIGS, queryRateLimiter, pipelineRateLimiter } from '../rate-limiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      maxRequests: 3,
      windowMs: 1000,
      keyPrefix: 'test',
    });
  });

  it('should allow requests within limit', async () => {
    const result1 = await rateLimiter.checkLimit('user-1');
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = await rateLimiter.checkLimit('user-1');
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = await rateLimiter.checkLimit('user-1');
    expect(result3.allowed).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it('should block requests exceeding limit', async () => {
    await rateLimiter.checkLimit('user-2');
    await rateLimiter.checkLimit('user-2');
    await rateLimiter.checkLimit('user-2');

    const result = await rateLimiter.checkLimit('user-2');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toContain('Rate limit exceeded');
  });

  it('should isolate limits per identifier', async () => {
    await rateLimiter.checkLimit('user-a');
    await rateLimiter.checkLimit('user-a');
    await rateLimiter.checkLimit('user-a');

    const resultA = await rateLimiter.checkLimit('user-a');
    expect(resultA.allowed).toBe(false);

    const resultB = await rateLimiter.checkLimit('user-b');
    expect(resultB.allowed).toBe(true);
  });

  it('should reset limit after window expires', async () => {
    await rateLimiter.checkLimit('user-3');
    await rateLimiter.checkLimit('user-3');
    await rateLimiter.checkLimit('user-3');

    const blocked = await rateLimiter.checkLimit('user-3');
    expect(blocked.allowed).toBe(false);

    await new Promise(resolve => setTimeout(resolve, 1100));

    const allowed = await rateLimiter.checkLimit('user-3');
    expect(allowed.allowed).toBe(true);
  });

  it('should manually reset limit', async () => {
    await rateLimiter.checkLimit('user-4');
    await rateLimiter.checkLimit('user-4');
    await rateLimiter.checkLimit('user-4');

    const blocked = await rateLimiter.checkLimit('user-4');
    expect(blocked.allowed).toBe(false);

    await rateLimiter.resetLimit('user-4');

    const allowed = await rateLimiter.checkLimit('user-4');
    expect(allowed.allowed).toBe(true);
  });

  it('should report remaining quota correctly', async () => {
    let remaining = await rateLimiter.getRemainingQuota('user-5');
    expect(remaining).toBe(3);

    await rateLimiter.checkLimit('user-5');
    remaining = await rateLimiter.getRemainingQuota('user-5');
    expect(remaining).toBe(2);

    await rateLimiter.checkLimit('user-5');
    remaining = await rateLimiter.getRemainingQuota('user-5');
    expect(remaining).toBe(1);

    await rateLimiter.checkLimit('user-5');
    remaining = await rateLimiter.getRemainingQuota('user-5');
    expect(remaining).toBe(0);
  });
});

describe('RATE_LIMIT_CONFIGS', () => {
  it('should define QUERY_EXECUTION config', () => {
    expect(RATE_LIMIT_CONFIGS.QUERY_EXECUTION).toBeDefined();
    expect(RATE_LIMIT_CONFIGS.QUERY_EXECUTION.maxRequests).toBe(10);
    expect(RATE_LIMIT_CONFIGS.QUERY_EXECUTION.windowMs).toBe(60 * 1000);
    expect(RATE_LIMIT_CONFIGS.QUERY_EXECUTION.keyPrefix).toBe('query');
  });

  it('should define PIPELINE_DEPLOY config', () => {
    expect(RATE_LIMIT_CONFIGS.PIPELINE_DEPLOY).toBeDefined();
    expect(RATE_LIMIT_CONFIGS.PIPELINE_DEPLOY.maxRequests).toBe(3);
    expect(RATE_LIMIT_CONFIGS.PIPELINE_DEPLOY.windowMs).toBe(60 * 1000);
    expect(RATE_LIMIT_CONFIGS.PIPELINE_DEPLOY.keyPrefix).toBe('pipeline');
  });

  it('should define CONFIG_GENERATION config', () => {
    expect(RATE_LIMIT_CONFIGS.CONFIG_GENERATION).toBeDefined();
    expect(RATE_LIMIT_CONFIGS.CONFIG_GENERATION.maxRequests).toBe(5);
    expect(RATE_LIMIT_CONFIGS.CONFIG_GENERATION.windowMs).toBe(60 * 1000);
  });

  it('should define PII_ACCESS config', () => {
    expect(RATE_LIMIT_CONFIGS.PII_ACCESS).toBeDefined();
    expect(RATE_LIMIT_CONFIGS.PII_ACCESS.maxRequests).toBe(5);
    expect(RATE_LIMIT_CONFIGS.PII_ACCESS.windowMs).toBe(60 * 1000);
    expect(RATE_LIMIT_CONFIGS.PII_ACCESS.keyPrefix).toBe('pii');
  });

  it('should define APPROVAL_REQUEST config', () => {
    expect(RATE_LIMIT_CONFIGS.APPROVAL_REQUEST).toBeDefined();
    expect(RATE_LIMIT_CONFIGS.APPROVAL_REQUEST.maxRequests).toBe(20);
    expect(RATE_LIMIT_CONFIGS.APPROVAL_REQUEST.windowMs).toBe(60 * 1000);
  });
});

describe('Global Rate Limiters', () => {
  it('should export queryRateLimiter', () => {
    expect(queryRateLimiter).toBeDefined();
    expect(queryRateLimiter).toBeInstanceOf(RateLimiter);
  });

  it('should export pipelineRateLimiter', () => {
    expect(pipelineRateLimiter).toBeDefined();
    expect(pipelineRateLimiter).toBeInstanceOf(RateLimiter);
  });

  it('should have independent state between limiters', async () => {
    const result1 = await queryRateLimiter.checkLimit('test-user');
    expect(result1.allowed).toBe(true);

    const result2 = await pipelineRateLimiter.checkLimit('test-user');
    expect(result2.allowed).toBe(true);
  });
});

describe('Rate Limiter Edge Cases', () => {
  it('should handle concurrent requests correctly', async () => {
    const limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 1000,
      keyPrefix: 'concurrent',
    });

    const promises = Array(10)
      .fill(null)
      .map(() => limiter.checkLimit('concurrent-user'));

    const results = await Promise.all(promises);

    const allowedCount = results.filter(r => r.allowed).length;
    const blockedCount = results.filter(r => !r.allowed).length;

    expect(allowedCount).toBe(5);
    expect(blockedCount).toBe(5);
  });

  it('should clean up expired entries', async () => {
    const limiter = new RateLimiter({
      maxRequests: 2,
      windowMs: 500,
      keyPrefix: 'cleanup',
    });

    await limiter.checkLimit('temp-user');
    await limiter.checkLimit('temp-user');

    await new Promise(resolve => setTimeout(resolve, 600));

    const result = await limiter.checkLimit('temp-user');
    expect(result.allowed).toBe(true);
  });

  it('should return resetTime in results', async () => {
    const limiter = new RateLimiter({
      maxRequests: 1,
      windowMs: 1000,
      keyPrefix: 'reset',
    });

    const result = await limiter.checkLimit('reset-user');
    expect(result.resetTime).toBeGreaterThan(Date.now());
    expect(result.resetTime).toBeLessThanOrEqual(Date.now() + 1000);
  });
});

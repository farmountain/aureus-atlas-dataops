export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  reason?: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.startCleanupInterval();
  }

  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    
    let entry = this.store.get(key);

    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
      };
      this.store.set(key, entry);
    }

    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        reason: `Rate limit exceeded. Max ${this.config.maxRequests} requests per ${this.config.windowMs / 1000}s`,
      };
    }

    entry.count++;
    this.store.set(key, entry);

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  async resetLimit(identifier: string): Promise<void> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    this.store.delete(key);
  }

  async getRemainingQuota(identifier: string): Promise<number> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    
    const entry = this.store.get(key);
    
    if (!entry || now >= entry.resetTime) {
      return this.config.maxRequests;
    }

    return Math.max(0, this.config.maxRequests - entry.count);
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now >= entry.resetTime + this.config.windowMs) {
          this.store.delete(key);
        }
      }
    }, this.config.windowMs);
  }
}

export const RATE_LIMIT_CONFIGS = {
  QUERY_EXECUTION: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    keyPrefix: 'query',
  },
  CONFIG_GENERATION: {
    maxRequests: 5,
    windowMs: 60 * 1000,
    keyPrefix: 'config',
  },
  PIPELINE_DEPLOY: {
    maxRequests: 3,
    windowMs: 60 * 1000,
    keyPrefix: 'pipeline',
  },
  APPROVAL_REQUEST: {
    maxRequests: 20,
    windowMs: 60 * 1000,
    keyPrefix: 'approval',
  },
  PII_ACCESS: {
    maxRequests: 5,
    windowMs: 60 * 1000,
    keyPrefix: 'pii',
  },
};

export const queryRateLimiter = new RateLimiter(RATE_LIMIT_CONFIGS.QUERY_EXECUTION);
export const configRateLimiter = new RateLimiter(RATE_LIMIT_CONFIGS.CONFIG_GENERATION);
export const pipelineRateLimiter = new RateLimiter(RATE_LIMIT_CONFIGS.PIPELINE_DEPLOY);
export const approvalRateLimiter = new RateLimiter(RATE_LIMIT_CONFIGS.APPROVAL_REQUEST);
export const piiAccessRateLimiter = new RateLimiter(RATE_LIMIT_CONFIGS.PII_ACCESS);

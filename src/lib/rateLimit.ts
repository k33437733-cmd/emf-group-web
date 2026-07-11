const rateMap = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOpts {
  maxRequests: number;
  windowMs: number;
}

export function checkRateLimit(key: string, opts: RateLimitOpts = { maxRequests: 10, windowMs: 1000 }): boolean {
  const now = Date.now();
  const entry = rateMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateMap.set(key, { count: 1, resetAt: now + opts.windowMs });
    return true;
  }
  if (entry.count >= opts.maxRequests) return false;
  entry.count++;
  return true;
}

export function getRateLimitRemaining(key: string): number {
  const entry = rateMap.get(key);
  if (!entry) return 10;
  return Math.max(0, 10 - entry.count);
}

export function clearRateLimits() { rateMap.clear(); }

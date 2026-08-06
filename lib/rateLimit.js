import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize the Upstash Redis rate limiter using env variables automatically
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '60 s'),
});

export async function checkRateLimit(req) {
  try {
    // Extract client IP address from headers or connection metadata
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const { success } = await ratelimit.limit(ip);
    return success;
  } catch (error) {
    console.error('[RateLimit] Redis unavailable; allowing request to continue:', error);
    return true;
  }
}

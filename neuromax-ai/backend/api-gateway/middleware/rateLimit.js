// Tiered, Redis-backed rate limiting using a fixed-window counter per user.
// Fails open if Redis is unavailable so an infra blip never blocks all traffic.
import { redis } from "../db.js";

// Requests allowed per 60-second window, by subscription tier.
const TIER_LIMITS = {
  free: 30,
  pro: 300,
  enterprise: 3000,
};

const WINDOW_SECONDS = 60;

export async function rateLimit(req, res, next) {
  const user = req.user;
  if (!user) return next(); // auth middleware runs first; defensive only.

  const limit = TIER_LIMITS[user.tier] ?? TIER_LIMITS.free;
  const windowId = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
  const key = `ratelimit:${user.id}:${windowId}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, WINDOW_SECONDS);

    const remaining = Math.max(0, limit - count);
    res.set("X-RateLimit-Limit", String(limit));
    res.set("X-RateLimit-Remaining", String(remaining));

    if (count > limit) {
      res.set("Retry-After", String(WINDOW_SECONDS));
      return res.status(429).json({
        error: "Rate limit exceeded",
        tier: user.tier,
        limit,
        window_seconds: WINDOW_SECONDS,
      });
    }
  } catch (err) {
    console.warn("[rateLimit] Redis unavailable, failing open:", err.message);
  }
  return next();
}

export { TIER_LIMITS };

# ADR-008: Redis as optional dependency with graceful fallback

**Status:** Accepted
**Date:** 2024-12-01

## Context
The platform benefits from a caching layer to reduce database load on frequently accessed data (pricing configurations, patient lists, dashboard statistics). Redis is the standard choice for distributed caching, but requiring it for every deployment -- including local development and small single-server production instances -- adds infrastructure overhead. Some team members develop on machines where running Redis is impractical, and the smallest production tiers on hosting platforms may not include a Redis instance. The caching system needed to work with or without Redis available.

## Decision
We implemented a two-level (L1/L2) cache in `src/lib/cache/index.ts`. L1 is an in-process `Map` with TTL-based expiration. L2 is Redis, accessed through `src/lib/redis/client.ts`. The Redis client is created only if `REDIS_URL` is set; if not, `getRedis()` returns `null` and all L2 operations silently no-op. The `cached()` function first checks L1, then L2, and finally calls the fetcher function, populating both layers on miss. All L2 operations (get, set, invalidate) are wrapped in try/catch blocks so Redis failures never propagate as errors to the caller. The Redis client uses lazy connection, a 5-second connect timeout, and a retry strategy that gives up after 5 attempts.

## Consequences
**Positive:**
- The application starts and runs correctly with zero configuration -- no Redis URL means pure in-memory caching with no errors or warnings
- When Redis is available, the L2 layer provides shared cache across multiple server instances and survives process restarts
- Redis connection failures degrade gracefully to L1-only caching rather than crashing the application
- The `invalidate()` function clears both L1 and L2 atomically (best-effort for L2), keeping cache coherency straightforward

**Negative:**
- Without Redis, each server instance maintains its own L1 cache, leading to inconsistencies in multi-instance deployments
- Silent L2 failures can mask Redis misconfigurations; operators may not realize Redis is down until they notice increased database load
- The L1 `Map` has no size limit, which could cause memory growth in long-running processes with many unique cache keys
- Cache invalidation with `redis.keys()` uses a scan pattern that performs poorly at scale and is discouraged in production Redis deployments

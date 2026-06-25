/**
 * ioredis connection options derived from a REDIS_URL, shared by every BullMQ
 * root registration (reports, GPS ingest, …). BullMQ workers require
 * `maxRetriesPerRequest: null`. Supports `rediss://` (TLS) and an optional db
 * index in the URL path (e.g. `redis://host:6379/2`).
 */
export interface BullRedisConnection {
  host: string;
  port: number;
  password?: string;
  username?: string;
  db: number;
  maxRetriesPerRequest: null;
  tls?: Record<string, never>;
}

export function bullRedisConnection(url: string): BullRedisConnection {
  const parsed = new URL(url);
  const db = parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) || 0 : 0;
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    username: parsed.username || undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db,
    maxRetriesPerRequest: null,
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { CacheService } from '../cache/cache.service';

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

/**
 * Brute-force protection for login (specs/07-api-spec.md): at most 5 failed
 * attempts per IP (and per username) within a 15-minute window, after which
 * further attempts are rejected with 429 until the window expires.
 *
 * Backed by Redis counters. If Redis is unreachable the counters read 0, so a
 * cache outage fails open (availability over lockout) — logged elsewhere.
 */
@Injectable()
export class LoginThrottleService {
  constructor(private readonly cache: CacheService) {}

  private ipKey(ip: string): string {
    return `login:fail:ip:${ip}`;
  }

  private userKey(username: string): string {
    return `login:fail:user:${username.toLowerCase()}`;
  }

  /** Throw 429 if either the IP or the username has exhausted its attempts. */
  async assertAllowed(ip: string, username: string): Promise<void> {
    const [ipCount, userCount] = await Promise.all([
      this.cache.get<number>(this.ipKey(ip)),
      this.cache.get<number>(this.userKey(username)),
    ]);
    if ((ipCount ?? 0) >= MAX_ATTEMPTS || (userCount ?? 0) >= MAX_ATTEMPTS) {
      throw new HttpException(
        'Terlalu banyak percobaan masuk. Silakan coba lagi nanti.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Record a failed attempt against both the IP and the username. */
  async registerFailure(ip: string, username: string): Promise<void> {
    await Promise.all([
      this.cache.increment(this.ipKey(ip), WINDOW_SECONDS),
      this.cache.increment(this.userKey(username), WINDOW_SECONDS),
    ]);
  }

  /** Clear counters after a successful login. */
  async reset(ip: string, username: string): Promise<void> {
    await Promise.all([this.cache.del(this.ipKey(ip)), this.cache.del(this.userKey(username))]);
  }
}

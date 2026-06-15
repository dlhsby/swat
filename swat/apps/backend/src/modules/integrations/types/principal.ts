/**
 * The unified principal behind an integration API call, resolved by the
 * {@link WeighbridgeGuard}. Either an interactive operator (OAuth2 bearer /
 * cookie session) or a machine ServiceAccount (API key). Downstream handlers,
 * the rate-limit middleware, and the API-audit interceptor read `req.principal`
 * so they need not care which credential type authenticated.
 */
export interface ApiPrincipal {
  readonly type: 'USER' | 'SERVICE_ACCOUNT';
  /** User id or ServiceAccount id (UUID). */
  readonly id: string;
  /** Username (users) or account name (service accounts) — for audit display. */
  readonly name: string;
  /** Role id used for the RBAC permission check. */
  readonly roleId: string;
  /** Per-account rate limit (service accounts only); users fall back to config. */
  readonly rateLimitPerMin?: number;
}

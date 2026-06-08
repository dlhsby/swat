import 'express-session';

/**
 * Identity persisted in the session store (Redis) and read by the auth guards
 * and `@CurrentUser`. Deliberately minimal — permissions are resolved per
 * request from the role (cached), so a role change takes effect without
 * re-issuing every active session.
 */
export interface SessionUser {
  readonly id: number;
  readonly username: string;
  readonly roleId: number;
  readonly mustChangePassword: boolean;
}

declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}

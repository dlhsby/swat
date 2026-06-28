import { type SessionUser } from '../../common/auth/session.types';

/** Request-derived context attached to every audit entry. */
export interface AuthContext {
  readonly ip: string;
  readonly userAgent: string;
}

/** Result of a successful credential check; the controller writes the session. */
export interface LoginResult {
  readonly user: SessionUser;
  readonly name: string;
  readonly roleName: string;
}

/** Full identity returned by `GET /auth/me`. */
export interface MeResult {
  readonly userId: string;
  readonly username: string;
  readonly name: string;
  readonly roleId: string;
  readonly roleName: string;
  readonly permissions: string[];
  readonly mustChangePassword: boolean;
}

/** Admin force-reset result; the temporary password is handed out of band. */
export interface ForceResetResult {
  readonly userId: string;
  readonly username: string;
  readonly temporaryPassword: string;
}

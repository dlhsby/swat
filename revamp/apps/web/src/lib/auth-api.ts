import { apiClient } from './api-client';

/** The authenticated user as returned by `GET /auth/me`. */
export interface CurrentUser {
  readonly userId: string;
  readonly username: string;
  readonly name: string;
  readonly roleId: string;
  readonly roleName: string;
  /** Flattened permission keys, e.g. `["trip:verify", "user:manage"]`. */
  readonly permissions: readonly string[];
  readonly mustChangePassword: boolean;
}

/** The subset returned by `POST /auth/login` (no permission list yet). */
export interface LoginResult {
  readonly userId: string;
  readonly username: string;
  readonly name: string;
  readonly roleId: string;
  readonly roleName: string;
  readonly mustChangePassword: boolean;
}

export interface ChangePasswordInput {
  /** Omitted on a forced (first-login) change — see auth.service.changePassword. */
  readonly currentPassword?: string;
  readonly newPassword: string;
  readonly confirmPassword: string;
}

export function login(username: string, password: string): Promise<LoginResult> {
  return apiClient.post<LoginResult>('/auth/login', { username, password });
}

export function logout(): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>('/auth/logout');
}

export function fetchMe(): Promise<CurrentUser> {
  return apiClient.get<CurrentUser>('/auth/me');
}

export function changePassword(input: ChangePasswordInput): Promise<{ message: string }> {
  return apiClient.patch<{ message: string }>('/auth/change-password', { ...input });
}

export function forceResetPassword(
  userId: string,
): Promise<{ userId: string; username: string; temporaryPassword: string }> {
  return apiClient.post(`/auth/force-reset/${userId}`);
}

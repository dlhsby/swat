import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';

import { AuthGuard } from '../auth.guard';

function contextWith(request: unknown): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  function makeGuard(isPublic: boolean): AuthGuard {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(isPublic),
    } as unknown as Reflector;
    return new AuthGuard(reflector);
  }

  it('allows public routes without a session', () => {
    expect(makeGuard(true).canActivate(contextWith({}))).toBe(true);
  });

  it('allows a request with a session user', () => {
    const ctx = contextWith({ session: { user: { id: 1, roleId: 7 } } });
    expect(makeGuard(false).canActivate(ctx)).toBe(true);
  });

  it('rejects a request without a session', () => {
    const ctx = contextWith({ session: {} });
    expect(() => makeGuard(false).canActivate(ctx)).toThrow(UnauthorizedException);
  });
});

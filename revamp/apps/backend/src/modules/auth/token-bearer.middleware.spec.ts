import { type Request, type Response } from 'express';

import { type SessionUser } from '../../common/auth/session.types';

import { TokenBearerMiddleware } from './token-bearer.middleware';
import { type TokenService } from './token.service';

const PRINCIPAL: SessionUser = {
  id: 'u-1',
  username: 'tpa1',
  roleId: 'r-1',
  mustChangePassword: false,
};

describe('TokenBearerMiddleware', () => {
  let tokens: { verifyAccessToken: jest.Mock };
  let middleware: TokenBearerMiddleware;
  let next: jest.Mock;

  beforeEach(() => {
    tokens = { verifyAccessToken: jest.fn().mockResolvedValue(PRINCIPAL) };
    middleware = new TokenBearerMiddleware(tokens as unknown as TokenService);
    next = jest.fn();
  });

  const run = (req: Partial<Request>): Promise<void> =>
    middleware.use(req as Request, {} as Response, next);

  it('attaches the verified principal for a valid bearer token', async () => {
    const req: Partial<Request> = { headers: { authorization: 'Bearer good.jwt.token' } };
    await run(req);
    expect(tokens.verifyAccessToken).toHaveBeenCalledWith('good.jwt.token');
    expect(req.user).toEqual(PRINCIPAL);
    expect(next).toHaveBeenCalled();
  });

  it('leaves req.user unset when the token is invalid', async () => {
    tokens.verifyAccessToken.mockRejectedValueOnce(new Error('bad'));
    const req: Partial<Request> = { headers: { authorization: 'Bearer bad' } };
    await run(req);
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('ignores requests without a bearer header', async () => {
    const req: Partial<Request> = { headers: {} };
    await run(req);
    expect(tokens.verifyAccessToken).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('prefers an existing cookie session over a bearer token', async () => {
    const req = {
      session: { user: PRINCIPAL },
      headers: { authorization: 'Bearer ignored' },
    } as unknown as Request;
    await run(req);
    expect(tokens.verifyAccessToken).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});

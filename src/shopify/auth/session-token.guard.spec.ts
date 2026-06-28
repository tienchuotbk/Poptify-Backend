import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { buildTestShopify } from '../testing/build-test-shopify';
import { SessionTokenGuard } from './session-token.guard';

const SECRET = 'test-api-secret';
const API_KEY = 'test-api-key';
const SHOP = 'https://test-shop.myshopify.com';

function payload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: `${SHOP}/admin`,
    dest: SHOP,
    aud: API_KEY,
    sub: '1',
    exp: now + 60,
    nbf: now - 10,
    iat: now - 10,
    jti: 'jti-1',
    sid: 'sid-1',
    ...overrides,
  };
}

function ctx(authorization?: string): ExecutionContext {
  const request = {
    headers: authorization !== undefined ? { authorization } : {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('SessionTokenGuard (task 2.3)', () => {
  const shopify = buildTestShopify();
  const guard = new SessionTokenGuard(shopify);

  it('accepts a valid session token', async () => {
    const token = jwt.sign(payload(), SECRET, { algorithm: 'HS256' });
    await expect(guard.canActivate(ctx(`Bearer ${token}`))).resolves.toBe(true);
  });

  it('rejects a missing Authorization header', async () => {
    await expect(guard.canActivate(ctx())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a non-Bearer header', async () => {
    await expect(guard.canActivate(ctx('Basic abc'))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a wrong-signature token', async () => {
    const token = jwt.sign(payload(), 'wrong-secret', { algorithm: 'HS256' });
    await expect(
      guard.canActivate(ctx(`Bearer ${token}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an expired token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      payload({ exp: now - 60, iat: now - 120, nbf: now - 120 }),
      SECRET,
      { algorithm: 'HS256' },
    );
    await expect(
      guard.canActivate(ctx(`Bearer ${token}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token with the wrong aud', async () => {
    const token = jwt.sign(payload({ aud: 'other-key' }), SECRET, {
      algorithm: 'HS256',
    });
    await expect(
      guard.canActivate(ctx(`Bearer ${token}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an alg:none token', async () => {
    const token = jwt.sign(payload(), '', { algorithm: 'none' });
    await expect(
      guard.canActivate(ctx(`Bearer ${token}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

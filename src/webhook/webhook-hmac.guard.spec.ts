import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { WebhookHmacGuard } from './webhook-hmac.guard';

const SECRET = 'test-api-secret';

function configStub(): ConfigService {
  return { getOrThrow: () => SECRET } as unknown as ConfigService;
}

function ctx(rawBody?: Buffer, hmac?: string): ExecutionContext {
  const request = {
    rawBody,
    headers: hmac !== undefined ? { 'x-shopify-hmac-sha256': hmac } : {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('WebhookHmacGuard (task 3.1/3.2)', () => {
  const guard = new WebhookHmacGuard(configStub());
  const body = Buffer.from(JSON.stringify({ shop_id: 1 }));
  const hmac = createHmac('sha256', SECRET).update(body).digest('base64');

  it('passes with a valid HMAC over the raw body', () => {
    expect(guard.canActivate(ctx(body, hmac))).toBe(true);
  });

  it('rejects an invalid HMAC', () => {
    expect(() => guard.canActivate(ctx(body, 'bad-hmac'))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a missing raw body', () => {
    expect(() => guard.canActivate(ctx(undefined, hmac))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a missing HMAC header', () => {
    expect(() => guard.canActivate(ctx(body))).toThrow(UnauthorizedException);
  });
});

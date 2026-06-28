import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SessionTokenGuard } from '../src/shopify/auth/session-token.guard';
import { TokenExchangeService } from '../src/shopify/auth/token-exchange.service';

const guardOverride = {
  canActivate: (ctx: ExecutionContext): boolean => {
    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, string>;
      shopifySession?: { dest: string };
    }>();
    const shop = req.headers['x-test-shop'] ?? 'acme.myshopify.com';
    req.shopifySession = { dest: `https://${shop}` };
    return true;
  },
};

describe('AuthController (e2e) (task 13.1)', () => {
  let app: INestApplication | undefined;
  let exchangeOffline: jest.Mock;

  beforeAll(async () => {
    exchangeOffline = jest.fn().mockResolvedValue({});
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(SessionTokenGuard)
      .useValue(guardOverride)
      .overrideProvider(TokenExchangeService)
      .useValue({ exchangeOffline })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('POST /api/auth/token-exchange → 200 + exchangeOffline(shop, token)', async () => {
    const res = await request(app!.getHttpServer())
      .post('/api/auth/token-exchange')
      .set('Authorization', 'Bearer faketok')
      .expect(200);

    expect(res.body).toEqual({
      shop: 'acme.myshopify.com',
      installed: true,
    });
    expect(exchangeOffline).toHaveBeenCalledWith(
      'acme.myshopify.com',
      'faketok',
    );
  });
});

import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SessionTokenGuard } from '../src/shopify/auth/session-token.guard';

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

const validSlider = {
  name: 'New arrivals',
  sourceType: 'featured',
  enabled: true,
  sourceConfig: { productHandles: ['cool-shirt', 'nice-hat'] },
};

describe('ProductSlidersController (e2e) (task 10.3)', () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(SessionTokenGuard)
      .useValue(guardOverride)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  const server = () => request(app!.getHttpServer());

  it('POST tạo slider hợp lệ → 201', async () => {
    const res = await server()
      .post('/api/product-sliders')
      .send(validSlider)
      .expect(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.publicId).toBeDefined();
  });

  it('POST sourceType=best_sellers (đã cắt) / field thừa → 400', async () => {
    await server()
      .post('/api/product-sliders')
      .send({ ...validSlider, sourceType: 'best_sellers' })
      .expect(400);
    await server()
      .post('/api/product-sliders')
      .send({ ...validSlider, evil: 'x' })
      .expect(400);
  });

  it('CRUD + cross-shop isolation', async () => {
    const created = await server()
      .post('/api/product-sliders')
      .send(validSlider)
      .expect(201);
    const id: number = created.body.id;

    await server()
      .get(`/api/product-sliders/${id}`)
      .set('x-test-shop', 'other.myshopify.com')
      .expect(404);
    await server()
      .patch(`/api/product-sliders/${id}`)
      .set('x-test-shop', 'other.myshopify.com')
      .send({ name: 'hack' })
      .expect(404);
    await server()
      .delete(`/api/product-sliders/${id}`)
      .set('x-test-shop', 'other.myshopify.com')
      .expect(404);

    const patched = await server()
      .patch(`/api/product-sliders/${id}`)
      .send({ enabled: false })
      .expect(200);
    expect(patched.body.enabled).toBe(false);

    await server().delete(`/api/product-sliders/${id}`).expect(204);
    await server().get(`/api/product-sliders/${id}`).expect(404);
  });
});

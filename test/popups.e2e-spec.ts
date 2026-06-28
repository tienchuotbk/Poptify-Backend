import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SessionTokenGuard } from '../src/shopify/auth/session-token.guard';

/**
 * E2e Popups CRUD (task 7.3/7.4). Override SessionTokenGuard để mô phỏng shop
 * qua header `x-test-shop` (mặc định acme) — không cần mint JWT thật.
 * Publisher chạy thật nhưng degrade graceful (không có offline session trong test DB).
 */
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

const validPopup = {
  name: 'Welcome',
  type: 'discount',
  enabled: true,
  contentConfig: { title: 'Get 10% off', couponCode: 'SAVE10' },
};

describe('PopupsController (e2e) (task 7.3/7.4)', () => {
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

  it('POST tạo popup hợp lệ → 201', async () => {
    const res = await server().post('/api/popups').send(validPopup).expect(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.shop).toBe('acme.myshopify.com');
  });

  it('POST field thừa → 400 (ValidationPipe forbidNonWhitelisted)', async () => {
    await server()
      .post('/api/popups')
      .send({ ...validPopup, evil: 'x' })
      .expect(400);
  });

  it('POST type sai enum → 400', async () => {
    await server()
      .post('/api/popups')
      .send({ ...validPopup, type: 'banner' })
      .expect(400);
  });

  it('POST buttonLink non-https → 400', async () => {
    await server()
      .post('/api/popups')
      .send({
        ...validPopup,
        contentConfig: { buttonLink: 'javascript:alert(1)' },
      })
      .expect(400);
  });

  it('CRUD + cross-shop isolation', async () => {
    // tạo ở acme
    const created = await server()
      .post('/api/popups')
      .send(validPopup)
      .expect(201);
    const id: number = created.body.id;

    // list acme thấy popup
    const list = await server().get('/api/popups').expect(200);
    expect(list.body.some((p: { id: number }) => p.id === id)).toBe(true);

    // shop khác KHÔNG thấy / không sửa được (cross-shop → 404)
    await server()
      .get(`/api/popups/${id}`)
      .set('x-test-shop', 'other.myshopify.com')
      .expect(404);
    await server()
      .patch(`/api/popups/${id}`)
      .set('x-test-shop', 'other.myshopify.com')
      .send({ name: 'hack' })
      .expect(404);
    await server()
      .delete(`/api/popups/${id}`)
      .set('x-test-shop', 'other.myshopify.com')
      .expect(404);

    // enable/disable
    const patched = await server()
      .patch(`/api/popups/${id}`)
      .send({ enabled: false })
      .expect(200);
    expect(patched.body.enabled).toBe(false);

    // delete → 204, rồi get → 404
    await server().delete(`/api/popups/${id}`).expect(204);
    await server().get(`/api/popups/${id}`).expect(404);
  });

  it('id không phải số → 400 (ParseIntPipe)', async () => {
    await server().get('/api/popups/abc').expect(400);
  });
});

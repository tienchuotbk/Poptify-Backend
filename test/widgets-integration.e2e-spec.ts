import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SessionTokenGuard } from '../src/shopify/auth/session-token.guard';
import { MetafieldPublisherService } from '../src/widgets/common/metafield-publisher.service';

/**
 * Integration e2e (task 11.1): xuyên suốt 3 module widget.
 * - create mỗi loại (app bật) → publish metafield key tương ứng có item.
 * - app_enabled=false → mọi key widget re-publish RỖNG (qua event).
 * - cross-shop isolation cho cả 3 module.
 * Publisher override bằng spy (không gọi Shopify thật).
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

const OTHER = 'other.myshopify.com';

function lastCall(publish: jest.Mock, key: string): unknown[] | undefined {
  return publish.mock.calls.filter((c) => c[1] === key).pop();
}

describe('Widgets integration (e2e) (task 11.1)', () => {
  let app: INestApplication | undefined;
  let publish: jest.Mock;

  beforeAll(async () => {
    publish = jest.fn().mockResolvedValue({ published: true });
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(SessionTokenGuard)
      .useValue(guardOverride)
      .overrideProvider(MetafieldPublisherService)
      .useValue({ publish })
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

  it('publish flow + app-off-empty + cross-shop cho cả 3 module', async () => {
    // bật app trước (default false → nếu không bật, projection rỗng)
    await server()
      .put('/api/app-settings')
      .send({ appEnabled: true })
      .expect(200);

    const popup = await server()
      .post('/api/popups')
      .send({ name: 'P', type: 'discount', enabled: true })
      .expect(201);
    const bar = await server()
      .post('/api/announcement-bars')
      .send({ name: 'B', type: 'simple', enabled: true })
      .expect(201);
    const slider = await server()
      .post('/api/product-sliders')
      .send({ name: 'S', sourceType: 'featured', enabled: true })
      .expect(201);

    // mỗi create → publish key tương ứng có 1 item
    expect(
      (lastCall(publish, 'popups') as [string, string, { popups: [] }])[2]
        .popups,
    ).toHaveLength(1);
    expect(
      (lastCall(publish, 'bars') as [string, string, { bars: [] }])[2].bars,
    ).toHaveLength(1);
    expect(
      (lastCall(publish, 'sliders') as [string, string, { sliders: [] }])[2]
        .sliders,
    ).toHaveLength(1);

    // tắt app → mọi key re-publish RỖNG + settings appEnabled=false
    publish.mockClear();
    await server()
      .put('/api/app-settings')
      .send({ appEnabled: false })
      .expect(200);

    expect(
      (
        lastCall(publish, 'settings') as [
          string,
          string,
          { appEnabled: boolean },
        ]
      )[2].appEnabled,
    ).toBe(false);
    expect(
      (lastCall(publish, 'popups') as [string, string, { popups: [] }])[2]
        .popups,
    ).toEqual([]);
    expect(
      (lastCall(publish, 'bars') as [string, string, { bars: [] }])[2].bars,
    ).toEqual([]);
    expect(
      (lastCall(publish, 'sliders') as [string, string, { sliders: [] }])[2]
        .sliders,
    ).toEqual([]);

    // cross-shop: shop khác KHÔNG thấy / không truy cập được resource của acme
    expect(
      (await server().get('/api/popups').set('x-test-shop', OTHER)).body,
    ).toEqual([]);
    expect(
      (await server().get('/api/announcement-bars').set('x-test-shop', OTHER))
        .body,
    ).toEqual([]);
    expect(
      (await server().get('/api/product-sliders').set('x-test-shop', OTHER))
        .body,
    ).toEqual([]);

    await server()
      .get(`/api/popups/${popup.body.id}`)
      .set('x-test-shop', OTHER)
      .expect(404);
    await server()
      .get(`/api/announcement-bars/${bar.body.id}`)
      .set('x-test-shop', OTHER)
      .expect(404);
    await server()
      .get(`/api/product-sliders/${slider.body.id}`)
      .set('x-test-shop', OTHER)
      .expect(404);
  });
});

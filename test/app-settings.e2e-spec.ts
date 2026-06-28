import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SessionTokenGuard } from '../src/shopify/auth/session-token.guard';
import { MetafieldPublisherService } from '../src/widgets/common/metafield-publisher.service';

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

describe('AppSettings (e2e) (task 8.2)', () => {
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

  it('GET tạo default lúc first-access (appEnabled=false)', async () => {
    const res = await server().get('/api/app-settings').expect(200);
    expect(res.body.appEnabled).toBe(false);
    expect(res.body.deviceTarget).toBe('all');
  });

  it('PUT cập nhật settings → 200', async () => {
    const res = await server()
      .put('/api/app-settings')
      .send({ appEnabled: true, deviceTarget: 'mobile' })
      .expect(200);
    expect(res.body.appEnabled).toBe(true);
    expect(res.body.deviceTarget).toBe('mobile');
  });

  it('PUT field sai enum / thừa → 400', async () => {
    await server()
      .put('/api/app-settings')
      .send({ deviceTarget: 'foo' })
      .expect(400);
    await server().put('/api/app-settings').send({ evil: 'x' }).expect(400);
  });

  it('toggle app_enabled=false → popups metafield re-publish RỖNG (event chain)', async () => {
    // bật app + tạo popup enabled
    await server().put('/api/app-settings').send({ appEnabled: true });
    await server()
      .post('/api/popups')
      .send({ name: 'P', type: 'discount', enabled: true })
      .expect(201);

    publish.mockClear();

    // tắt app → AppSettings.update emit event → PopupsService re-publish rỗng
    await server()
      .put('/api/app-settings')
      .send({ appEnabled: false })
      .expect(200);

    const settingsCall = publish.mock.calls.find((c) => c[1] === 'settings');
    const popupsCall = publish.mock.calls.find((c) => c[1] === 'popups');
    expect(settingsCall?.[2]).toEqual(
      expect.objectContaining({ appEnabled: false }),
    );
    expect(popupsCall).toBeDefined();
    expect(popupsCall?.[2].popups).toEqual([]);
  });
});

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health + CSP (e2e) (task 4.1/4.2)', () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /healthz → 200 ok', () => {
    return request(app!.getHttpServer())
      .get('/healthz')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /readyz → 200 ready (sqljs up)', () => {
    return request(app!.getHttpServer())
      .get('/readyz')
      .expect(200)
      .expect({ status: 'ready', db: 'up' });
  });

  it('sets CSP frame-ancestors scoped to the shop', async () => {
    const res = await request(app!.getHttpServer())
      .get('/healthz?shop=test.myshopify.com')
      .expect(200);
    expect(res.headers['content-security-policy']).toContain('frame-ancestors');
    expect(res.headers['content-security-policy']).toContain(
      'https://test.myshopify.com',
    );
  });
});

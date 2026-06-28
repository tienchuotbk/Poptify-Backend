import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// Env hợp lệ được nạp ở test/setup-e2e-env.ts (jest setupFiles), trước khi import AppModule.
describe('AppController (e2e)', () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET / → 200 + health payload', () => {
    return request(app!.getHttpServer())
      .get('/')
      .expect(200)
      .expect({ name: 'poptify-backend', status: 'ok' });
  });
});

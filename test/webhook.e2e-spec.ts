import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createHmac } from 'crypto';
import request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { ProcessedWebhookEntity } from '../src/database/entities/processed-webhook.entity';
import { ShopEntity } from '../src/database/entities/shop.entity';
import { AppUninstalledHandler } from '../src/webhook/handlers/app-uninstalled.handler';

const SECRET = 'test-api-secret';
const SHOP = 'acme.myshopify.com';

function sign(body: string): string {
  return createHmac('sha256', SECRET).update(body).digest('base64');
}

describe('WebhookController (e2e) (task 3.2/3.3)', () => {
  let app: INestApplication | undefined;
  let shops: Repository<ShopEntity>;
  let processed: Repository<ProcessedWebhookEntity>;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    await app.init();
    shops = app.get(getRepositoryToken(ShopEntity));
    processed = app.get(getRepositoryToken(ProcessedWebhookEntity));
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await processed.clear();
    await shops.clear();
  });

  function postWebhook(body: string, headers: Record<string, string>) {
    return request(app!.getHttpServer())
      .post('/webhooks')
      .set('Content-Type', 'application/json')
      .set(headers)
      .send(body);
  }

  function headers(hmac: string, id = 'wh-1', topic = 'app/uninstalled') {
    return {
      'x-shopify-hmac-sha256': hmac,
      'x-shopify-topic': topic,
      'x-shopify-webhook-id': id,
      'x-shopify-shop-domain': SHOP,
    };
  }

  it('rejects an invalid HMAC with 401', async () => {
    const body = JSON.stringify({ domain: SHOP });
    await postWebhook(body, headers('invalid-hmac')).expect(401);
  });

  it('processes app/uninstalled once and is idempotent on replay', async () => {
    await shops.save(
      shops.create({ shop: SHOP, installed: true, installedAt: new Date() }),
    );

    const body = JSON.stringify({ domain: SHOP });
    const signed = headers(sign(body));

    await postWebhook(body, signed).expect(200);
    await postWebhook(body, signed).expect(200); // replay cùng webhook-id

    expect(await processed.count()).toBe(1);
    const shop = await shops.findOneByOrFail({ shop: SHOP });
    expect(shop.installed).toBe(false);
  });
});

describe('WebhookController (e2e) — dispatch fail nhả lock dedup (finding major #1)', () => {
  let app: INestApplication | undefined;
  let shops: Repository<ShopEntity>;
  let processed: Repository<ProcessedWebhookEntity>;
  const handle = jest.fn();

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AppUninstalledHandler)
      .useValue({ handle })
      .compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    await app.init();
    shops = app.get(getRepositoryToken(ShopEntity));
    processed = app.get(getRepositoryToken(ProcessedWebhookEntity));
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await processed.clear();
    await shops.clear();
    handle.mockReset();
  });

  function postWebhook(body: string, headers: Record<string, string>) {
    return request(app!.getHttpServer())
      .post('/webhooks')
      .set('Content-Type', 'application/json')
      .set(headers)
      .send(body);
  }

  function headers(hmac: string, id = 'wh-retry', topic = 'app/uninstalled') {
    return {
      'x-shopify-hmac-sha256': hmac,
      'x-shopify-topic': topic,
      'x-shopify-webhook-id': id,
      'x-shopify-shop-domain': SHOP,
    };
  }

  it('xử lý fail → 5xx + nhả lock; retry cùng webhook-id được xử lý lại (không mất event)', async () => {
    const body = JSON.stringify({ domain: SHOP });
    const signed = headers(sign(body));

    // Lần 1: handler ném lỗi → request 5xx, KHÔNG còn row dedup (lock đã nhả).
    handle.mockRejectedValueOnce(new Error('transient failure'));
    const failed = await postWebhook(body, signed);
    expect(failed.status).toBeGreaterThanOrEqual(500);
    expect(await processed.count()).toBe(0);

    // Lần 2 (Shopify retry cùng webhook-id): handler OK → 200, xử lý đúng 1 lần.
    handle.mockResolvedValueOnce(undefined);
    await postWebhook(body, signed).expect(200);

    expect(handle).toHaveBeenCalledTimes(2);
    expect(await processed.count()).toBe(1);
  });
});

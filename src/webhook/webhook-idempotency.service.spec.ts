import { DataSource } from 'typeorm';
import { ProcessedWebhookEntity } from '../database/entities/processed-webhook.entity';
import { createTestDataSource } from '../database/testing/create-test-data-source';
import { WebhookIdempotencyService } from './webhook-idempotency.service';

describe('WebhookIdempotencyService (task 3.2)', () => {
  let dataSource: DataSource;
  let service: WebhookIdempotencyService;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    service = new WebhookIdempotencyService(
      dataSource.getRepository(ProcessedWebhookEntity),
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  afterEach(async () => {
    await dataSource.getRepository(ProcessedWebhookEntity).clear();
  });

  it('returns true the first time and false on replay (same webhook id)', async () => {
    expect(await service.registerIfNew('wh-1', 'app/uninstalled')).toBe(true);
    expect(await service.registerIfNew('wh-1', 'app/uninstalled')).toBe(false);
  });

  it('treats distinct webhook ids as new', async () => {
    expect(await service.registerIfNew('a', 'orders/create')).toBe(true);
    expect(await service.registerIfNew('b', 'orders/create')).toBe(true);
  });

  it('release() nhả lock để cùng webhook id được xử lý lại (retry sau khi fail)', async () => {
    expect(await service.registerIfNew('wh-x', 'app/uninstalled')).toBe(true);
    expect(await service.registerIfNew('wh-x', 'app/uninstalled')).toBe(false);

    await service.release('wh-x'); // mô phỏng dispatch fail → nhả lock

    expect(await service.registerIfNew('wh-x', 'app/uninstalled')).toBe(true);
  });
});

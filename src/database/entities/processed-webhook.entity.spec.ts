import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { createTestDataSource } from '../testing/create-test-data-source';
import { ProcessedWebhookEntity } from './processed-webhook.entity';

describe('ProcessedWebhookEntity', () => {
  let dataSource: DataSource;
  let repo: Repository<ProcessedWebhookEntity>;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repo = dataSource.getRepository(ProcessedWebhookEntity);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  afterEach(async () => {
    await repo.clear();
  });

  it('records a processed webhook with processedAt set', async () => {
    const saved = await repo.save(
      repo.create({
        webhookId: 'wh-0001',
        topic: 'app/uninstalled',
      }),
    );

    expect(saved.id).toBeDefined();
    const loaded = await repo.findOneByOrFail({ webhookId: 'wh-0001' });
    expect(loaded.topic).toBe('app/uninstalled');
    expect(loaded.processedAt).toBeDefined();
  });

  it('rejects a duplicate X-Shopify-Webhook-Id (idempotency)', async () => {
    await repo.save(
      repo.create({ webhookId: 'wh-dup', topic: 'orders/create' }),
    );

    await expect(
      repo.save(repo.create({ webhookId: 'wh-dup', topic: 'orders/create' })),
    ).rejects.toBeInstanceOf(QueryFailedError);
  });
});

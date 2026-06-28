import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { createTestDataSource } from '../testing/create-test-data-source';
import { ShopEntity } from './shop.entity';

describe('ShopEntity', () => {
  let dataSource: DataSource;
  let repo: Repository<ShopEntity>;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repo = dataSource.getRepository(ShopEntity);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  afterEach(async () => {
    await repo.clear();
  });

  it('creates and reads a shop record', async () => {
    const installedAt = new Date('2026-06-28T00:00:00.000Z');
    const saved = await repo.save(
      repo.create({
        shop: 'acme.myshopify.com',
        installed: true,
        installedAt,
      }),
    );

    expect(saved.id).toBeDefined();

    const loaded = await repo.findOneByOrFail({ shop: 'acme.myshopify.com' });
    expect(loaded.installed).toBe(true);
    expect(loaded.uninstalledAt ?? null).toBeNull();
    expect(new Date(loaded.installedAt as Date).toISOString()).toBe(
      installedAt.toISOString(),
    );
  });

  it('enforces unique shop domain', async () => {
    await repo.save(
      repo.create({ shop: 'dup.myshopify.com', installed: true }),
    );

    await expect(
      repo.save(repo.create({ shop: 'dup.myshopify.com', installed: false })),
    ).rejects.toBeInstanceOf(QueryFailedError);
  });
});

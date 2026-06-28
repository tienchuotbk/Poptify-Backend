import { DataSource, Repository } from 'typeorm';
import { createTestDataSource } from '../testing/create-test-data-source';
import { ShopifySessionEntity } from './shopify-session.entity';

describe('ShopifySessionEntity', () => {
  let dataSource: DataSource;
  let repo: Repository<ShopifySessionEntity>;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    repo = dataSource.getRepository(ShopifySessionEntity);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  afterEach(async () => {
    await repo.clear();
  });

  it('round-trips an offline session (save → load, field-equal)', async () => {
    const expires = new Date('2026-07-01T00:00:00.000Z');
    const session = repo.create({
      id: 'offline_test.myshopify.com',
      shop: 'test.myshopify.com',
      state: 'nonce-123',
      isOnline: false,
      scope: 'read_products,write_products',
      expires,
      accessToken: 'shpua_test_token',
      onlineAccessInfo: null,
    });

    await repo.save(session);
    const loaded = await repo.findOneByOrFail({ id: session.id });

    expect(loaded.shop).toBe('test.myshopify.com');
    expect(loaded.state).toBe('nonce-123');
    expect(loaded.isOnline).toBe(false);
    expect(loaded.scope).toBe('read_products,write_products');
    expect(loaded.accessToken).toBe('shpua_test_token');
    expect(loaded.onlineAccessInfo).toBeNull();
    expect(new Date(loaded.expires as Date).toISOString()).toBe(
      expires.toISOString(),
    );
  });

  it('persists nullable fields as null', async () => {
    await repo.save(
      repo.create({
        id: 'offline_minimal.myshopify.com',
        shop: 'minimal.myshopify.com',
        state: '',
        isOnline: false,
      }),
    );
    const loaded = await repo.findOneByOrFail({
      id: 'offline_minimal.myshopify.com',
    });

    expect(loaded.scope ?? null).toBeNull();
    expect(loaded.expires ?? null).toBeNull();
    expect(loaded.accessToken ?? null).toBeNull();
  });
});

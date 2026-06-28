import { Session } from '@shopify/shopify-api';
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../../database/testing/create-test-data-source';
import { ShopifySessionEntity } from '../../database/entities/shopify-session.entity';
import { TypeormSessionStorage } from './typeorm-session.storage';

function offlineSession(shop = 'test.myshopify.com'): Session {
  return new Session({
    id: `offline_${shop}`,
    shop,
    state: '',
    isOnline: false,
    scope: 'read_products',
    accessToken: 'offline-token',
    expires: new Date('2026-07-01T00:00:00.000Z'),
  });
}

describe('TypeormSessionStorage (task 2.2)', () => {
  let dataSource: DataSource;
  let storage: TypeormSessionStorage;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    storage = new TypeormSessionStorage(
      dataSource.getRepository(ShopifySessionEntity),
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  afterEach(async () => {
    await dataSource.getRepository(ShopifySessionEntity).clear();
  });

  it('stores and loads a session (round-trip)', async () => {
    const session = offlineSession();
    expect(await storage.storeSession(session)).toBe(true);

    const loaded = await storage.loadSession(session.id);
    expect(loaded).toBeDefined();
    expect(loaded?.shop).toBe('test.myshopify.com');
    expect(loaded?.isOnline).toBe(false);
    expect(loaded?.scope).toBe('read_products');
    expect(loaded?.accessToken).toBe('offline-token');
    expect(loaded?.expires?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });

  it('returns undefined for a missing session', async () => {
    expect(await storage.loadSession('does-not-exist')).toBeUndefined();
  });

  it('deletes a session', async () => {
    const session = offlineSession();
    await storage.storeSession(session);
    expect(await storage.deleteSession(session.id)).toBe(true);
    expect(await storage.loadSession(session.id)).toBeUndefined();
  });

  it('finds sessions by shop', async () => {
    await storage.storeSession(offlineSession('a.myshopify.com'));
    await storage.storeSession(offlineSession('b.myshopify.com'));

    const found = await storage.findSessionsByShop('a.myshopify.com');
    expect(found).toHaveLength(1);
    expect(found[0].shop).toBe('a.myshopify.com');
  });
});

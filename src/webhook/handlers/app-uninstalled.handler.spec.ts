import { Session } from '@shopify/shopify-api';
import { DataSource, Repository } from 'typeorm';
import { ShopEntity } from '../../database/entities/shop.entity';
import { ShopifySessionEntity } from '../../database/entities/shopify-session.entity';
import { createTestDataSource } from '../../database/testing/create-test-data-source';
import { TypeormSessionStorage } from '../../shopify/session/typeorm-session.storage';
import { AppUninstalledHandler } from './app-uninstalled.handler';

const SHOP = 'acme.myshopify.com';

describe('AppUninstalledHandler (task 3.3)', () => {
  let dataSource: DataSource;
  let handler: AppUninstalledHandler;
  let storage: TypeormSessionStorage;
  let shops: Repository<ShopEntity>;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    storage = new TypeormSessionStorage(
      dataSource.getRepository(ShopifySessionEntity),
    );
    shops = dataSource.getRepository(ShopEntity);
    handler = new AppUninstalledHandler(shops, storage);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  afterEach(async () => {
    await dataSource.getRepository(ShopEntity).clear();
    await dataSource.getRepository(ShopifySessionEntity).clear();
  });

  it('marks the shop uninstalled and deletes its sessions', async () => {
    await shops.save(
      shops.create({ shop: SHOP, installed: true, installedAt: new Date() }),
    );
    await storage.storeSession(
      new Session({
        id: `offline_${SHOP}`,
        shop: SHOP,
        state: '',
        isOnline: false,
        accessToken: 'offline-token',
      }),
    );

    await handler.handle(SHOP);

    const shop = await shops.findOneByOrFail({ shop: SHOP });
    expect(shop.installed).toBe(false);
    expect(shop.uninstalledAt).toBeTruthy();
    expect(await storage.findSessionsByShop(SHOP)).toHaveLength(0);
  });

  it('is a no-op for an unknown shop', async () => {
    await expect(
      handler.handle('unknown.myshopify.com'),
    ).resolves.toBeUndefined();
  });
});

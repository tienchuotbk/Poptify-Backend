import { RequestedTokenType, Session } from '@shopify/shopify-api';
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../../database/testing/create-test-data-source';
import { ShopEntity } from '../../database/entities/shop.entity';
import { ShopifySessionEntity } from '../../database/entities/shopify-session.entity';
import { TypeormSessionStorage } from '../session/typeorm-session.storage';
import { buildTestShopify } from '../testing/build-test-shopify';
import { ShopifyApi } from '../shopify.constants';
import { TokenExchangeService } from './token-exchange.service';

const SHOP = 'test-shop.myshopify.com';

describe('TokenExchangeService (task 2.4)', () => {
  let dataSource: DataSource;
  let service: TokenExchangeService;
  let shopify: ShopifyApi;
  let tokenExchange: jest.Mock;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.getRepository(ShopifySessionEntity).clear();
    await dataSource.getRepository(ShopEntity).clear();

    shopify = buildTestShopify();
    tokenExchange = jest.fn().mockResolvedValue({
      session: new Session({
        id: `offline_${SHOP}`,
        shop: SHOP,
        state: '',
        isOnline: false,
        scope: 'read_products',
        accessToken: 'offline-access-token',
      }),
    });
    (shopify.auth as unknown as { tokenExchange: jest.Mock }).tokenExchange =
      tokenExchange;

    const storage = new TypeormSessionStorage(
      dataSource.getRepository(ShopifySessionEntity),
    );
    service = new TokenExchangeService(
      shopify,
      storage,
      dataSource.getRepository(ShopEntity),
    );
  });

  it('exchanges for an OFFLINE token and persists session + shop', async () => {
    const session = await service.exchangeOffline(SHOP, 'a-session-token');

    expect(session.accessToken).toBe('offline-access-token');
    expect(tokenExchange).toHaveBeenCalledWith(
      expect.objectContaining({
        shop: SHOP,
        sessionToken: 'a-session-token',
        requestedTokenType: RequestedTokenType.OfflineAccessToken,
      }),
    );

    const stored = await dataSource
      .getRepository(ShopifySessionEntity)
      .findOneByOrFail({ id: `offline_${SHOP}` });
    expect(stored).toBeDefined();

    const shop = await dataSource
      .getRepository(ShopEntity)
      .findOneByOrFail({ shop: SHOP });
    expect(shop.installed).toBe(true);
    expect(shop.installedAt).toBeTruthy();
  });

  it('stores the access token encrypted at rest', async () => {
    await service.exchangeOffline(SHOP, 'a-session-token');
    const raw = await dataSource.query(
      `SELECT accessToken AS t FROM shopify_sessions WHERE id = 'offline_${SHOP}'`,
    );
    expect(raw[0].t).not.toBe('offline-access-token');
  });
});

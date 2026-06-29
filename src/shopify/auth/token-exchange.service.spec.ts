import { Session } from '@shopify/shopify-api';
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../../database/testing/create-test-data-source';
import { ShopEntity } from '../../database/entities/shop.entity';
import { OfflineTokenService } from './offline-token.service';
import { TokenExchangeService } from './token-exchange.service';

const SHOP = 'test-shop.myshopify.com';

describe('TokenExchangeService (task 2.4)', () => {
  let dataSource: DataSource;
  let service: TokenExchangeService;
  let exchangeOffline: jest.Mock;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.getRepository(ShopEntity).clear();

    exchangeOffline = jest.fn().mockResolvedValue(
      new Session({
        id: `offline_${SHOP}`,
        shop: SHOP,
        state: '',
        isOnline: false,
        scope: 'read_products',
        accessToken: 'offline-access-token',
      }),
    );
    const offlineToken = { exchangeOffline } as unknown as OfflineTokenService;
    service = new TokenExchangeService(
      offlineToken,
      dataSource.getRepository(ShopEntity),
    );
  });

  it('delegate sang OfflineTokenService và đánh dấu shop installed', async () => {
    const session = await service.exchangeOffline(SHOP, 'a-session-token');

    expect(session.accessToken).toBe('offline-access-token');
    expect(exchangeOffline).toHaveBeenCalledWith(SHOP, 'a-session-token');

    const shop = await dataSource
      .getRepository(ShopEntity)
      .findOneByOrFail({ shop: SHOP });
    expect(shop.installed).toBe(true);
    expect(shop.installedAt).toBeTruthy();
  });
});

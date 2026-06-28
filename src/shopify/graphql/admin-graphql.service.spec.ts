import { Session } from '@shopify/shopify-api';
import { buildTestShopify } from '../testing/build-test-shopify';
import { AdminGraphqlService } from './admin-graphql.service';

describe('AdminGraphqlService (task 2.6)', () => {
  it('runs a query and returns the data payload', async () => {
    const shopify = buildTestShopify();
    (shopify.clients as unknown as { Graphql: unknown }).Graphql = class {
      async request(): Promise<{ data: { shop: { name: string } } }> {
        return { data: { shop: { name: 'Test Shop' } } };
      }
    };

    const service = new AdminGraphqlService(shopify);
    const session = new Session({
      id: 's',
      shop: 'test-shop.myshopify.com',
      state: '',
      isOnline: false,
      accessToken: 'offline-token',
    });

    const data = await service.query<{ shop: { name: string } }>(
      session,
      '{ shop { name } }',
    );
    expect(data.shop.name).toBe('Test Shop');
  });

  it('uses the apiVersion pinned in config (2026-04)', () => {
    const shopify = buildTestShopify() as unknown as {
      config: { apiVersion: string };
    };
    expect(shopify.config.apiVersion).toBe('2026-04');
  });
});

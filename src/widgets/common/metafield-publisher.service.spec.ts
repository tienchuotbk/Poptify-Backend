import { Session } from '@shopify/shopify-api';
import { OfflineTokenService } from '../../shopify/auth/offline-token.service';
import { AdminGraphqlService } from '../../shopify/graphql/admin-graphql.service';
import { MetafieldPublisherService } from './metafield-publisher.service';

const SHOP = 'acme.myshopify.com';
const SHOP_GID = 'gid://shopify/Shop/123456';

function buildService() {
  const getValidSession = jest.fn();
  const query = jest.fn();

  const offlineToken = { getValidSession } as unknown as OfflineTokenService;
  const admin = { query } as unknown as AdminGraphqlService;

  const service = new MetafieldPublisherService(offlineToken, admin);
  return { service, getValidSession, query };
}

const fakeSession = { id: `offline_${SHOP}`, shop: SHOP } as Session;

describe('MetafieldPublisherService (task 6.5)', () => {
  it('không có offline session → degrade graceful (không gọi Admin, không throw)', async () => {
    const { service, getValidSession, query } = buildService();
    getValidSession.mockResolvedValue(null);

    const result = await service.publish(SHOP, 'popups', { popups: [] });

    expect(result).toEqual({ published: false });
    expect(query).not.toHaveBeenCalled();
  });

  it('publish: lấy shop gid rồi metafieldsSet với ownerId/key/type/value đúng', async () => {
    const { service, getValidSession, query } = buildService();
    getValidSession.mockResolvedValue(fakeSession);
    query
      .mockResolvedValueOnce({ shop: { id: SHOP_GID } }) // ShopGid query
      .mockResolvedValueOnce({
        metafieldsSet: { metafields: [{ id: 'gid://m/1' }], userErrors: [] },
      });

    const value = { popups: [{ name: 'x' }] };
    const result = await service.publish(SHOP, 'popups', value);

    expect(result).toEqual({ published: true });
    expect(query).toHaveBeenCalledTimes(2);

    // call thứ 2 = metafieldsSet
    const [, mutation, variables] = query.mock.calls[1];
    expect(mutation).toContain('metafieldsSet');
    expect(variables).toEqual({
      metafields: [
        {
          ownerId: SHOP_GID,
          key: 'popups',
          type: 'json',
          value: JSON.stringify(value),
        },
      ],
    });
    // KHÔNG set namespace → mặc định $app
    expect(variables.metafields[0]).not.toHaveProperty('namespace');
  });

  it('userErrors từ metafieldsSet → throw', async () => {
    const { service, getValidSession, query } = buildService();
    getValidSession.mockResolvedValue(fakeSession);
    query
      .mockResolvedValueOnce({ shop: { id: SHOP_GID } })
      .mockResolvedValueOnce({
        metafieldsSet: {
          metafields: [],
          userErrors: [
            { field: ['value'], message: 'invalid json', code: 'INVALID' },
          ],
        },
      });

    await expect(service.publish(SHOP, 'popups', {})).rejects.toThrow(
      /metafieldsSet thất bại/,
    );
  });

  it('lỗi query lấy shop gid → propagate ra caller', async () => {
    const { service, getValidSession, query } = buildService();
    getValidSession.mockResolvedValue(fakeSession);
    query.mockRejectedValueOnce(new Error('network'));

    await expect(service.publish(SHOP, 'popups', {})).rejects.toThrow(
      /network/,
    );
  });

  it('response thiếu metafieldsSet → throw controlled', async () => {
    const { service, getValidSession, query } = buildService();
    getValidSession.mockResolvedValue(fakeSession);
    query
      .mockResolvedValueOnce({ shop: { id: SHOP_GID } })
      .mockResolvedValueOnce({});

    await expect(service.publish(SHOP, 'popups', {})).rejects.toThrow(
      /response thiếu metafieldsSet/,
    );
  });
});

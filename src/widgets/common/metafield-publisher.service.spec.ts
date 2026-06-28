import { Session } from '@shopify/shopify-api';
import { AdminGraphqlService } from '../../shopify/graphql/admin-graphql.service';
import { TypeormSessionStorage } from '../../shopify/session/typeorm-session.storage';
import { ShopifyApi } from '../../shopify/shopify.constants';
import { MetafieldPublisherService } from './metafield-publisher.service';

const SHOP = 'acme.myshopify.com';
const SHOP_GID = 'gid://shopify/Shop/123456';

function buildService() {
  const getOfflineId = jest.fn().mockReturnValue(`offline_${SHOP}`);
  const loadSession = jest.fn();
  const query = jest.fn();

  const shopify = { session: { getOfflineId } } as unknown as ShopifyApi;
  const sessions = { loadSession } as unknown as TypeormSessionStorage;
  const admin = { query } as unknown as AdminGraphqlService;

  const service = new MetafieldPublisherService(shopify, sessions, admin);
  return { service, getOfflineId, loadSession, query };
}

const fakeSession = { id: `offline_${SHOP}`, shop: SHOP } as Session;

describe('MetafieldPublisherService (task 6.5)', () => {
  it('không có offline session → degrade graceful (không gọi Admin, không throw)', async () => {
    const { service, loadSession, query } = buildService();
    loadSession.mockResolvedValue(undefined);

    const result = await service.publish(SHOP, 'popups', { popups: [] });

    expect(result).toEqual({ published: false });
    expect(query).not.toHaveBeenCalled();
  });

  it('publish: lấy shop gid rồi metafieldsSet với ownerId/key/type/value đúng', async () => {
    const { service, loadSession, query } = buildService();
    loadSession.mockResolvedValue(fakeSession);
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
    const { service, loadSession, query } = buildService();
    loadSession.mockResolvedValue(fakeSession);
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
    const { service, loadSession, query } = buildService();
    loadSession.mockResolvedValue(fakeSession);
    query.mockRejectedValueOnce(new Error('network'));

    await expect(service.publish(SHOP, 'popups', {})).rejects.toThrow(
      /network/,
    );
  });

  it('response thiếu metafieldsSet → throw controlled', async () => {
    const { service, loadSession, query } = buildService();
    loadSession.mockResolvedValue(fakeSession);
    query
      .mockResolvedValueOnce({ shop: { id: SHOP_GID } })
      .mockResolvedValueOnce({});

    await expect(service.publish(SHOP, 'popups', {})).rejects.toThrow(
      /response thiếu metafieldsSet/,
    );
  });
});

import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createTestDataSource } from '../../database/testing/create-test-data-source';
import { ShopifySessionEntity } from '../../database/entities/shopify-session.entity';
import { TypeormSessionStorage } from '../session/typeorm-session.storage';
import { buildTestShopify } from '../testing/build-test-shopify';
import { OfflineTokenService } from './offline-token.service';

const SHOP = 'test-shop.myshopify.com';
const OFFLINE_ID = `offline_${SHOP}`;

function mockFetchOnce(body: object): void {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

async function seed(
  storage: TypeormSessionStorage,
  patch: Partial<ShopifySessionEntity>,
): Promise<void> {
  const entity = new ShopifySessionEntity();
  entity.id = OFFLINE_ID;
  entity.shop = SHOP;
  entity.state = '';
  entity.isOnline = false;
  entity.accessToken = 'shpat_old';
  Object.assign(entity, patch);
  await storage.saveEntity(entity);
}

describe('OfflineTokenService (expiring offline token)', () => {
  let dataSource: DataSource;
  let storage: TypeormSessionStorage;
  let service: OfflineTokenService;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.getRepository(ShopifySessionEntity).clear();
    storage = new TypeormSessionStorage(
      dataSource.getRepository(ShopifySessionEntity),
    );
    const config = {
      getOrThrow: (k: string) => (k === 'SHOPIFY_API_KEY' ? 'key' : 'secret'),
    } as unknown as ConfigService;
    service = new OfflineTokenService(buildTestShopify(), config, storage);
    global.fetch = jest.fn();
  });

  it('exchangeOffline gửi expiring=1 và lưu access + refresh token (mã hóa at-rest)', async () => {
    mockFetchOnce({
      access_token: 'shpat_new',
      scope: 'write_products',
      expires_in: 3600,
      refresh_token: 'shprt_new',
      refresh_token_expires_in: 7776000,
    });

    const session = await service.exchangeOffline(SHOP, 'session-token');
    expect(session.accessToken).toBe('shpat_new');

    const body = (global.fetch as jest.Mock).mock.calls[0][1]
      .body as URLSearchParams;
    expect(body.get('expiring')).toBe('1');
    expect(body.get('grant_type')).toContain('token-exchange');

    const raw = await dataSource.query(
      `SELECT accessToken AS a, refreshToken AS r FROM shopify_sessions WHERE id = '${OFFLINE_ID}'`,
    );
    expect(raw[0].a).not.toBe('shpat_new'); // mã hóa
    expect(raw[0].r).not.toBe('shprt_new'); // mã hóa
  });

  it('getValidSession refresh khi access token sắp hết hạn', async () => {
    await seed(storage, {
      expires: new Date(Date.now() + 10_000), // còn 10s → dưới buffer 2 phút
      refreshToken: 'shprt_old',
      refreshTokenExpires: new Date(Date.now() + 86_400_000),
    });
    mockFetchOnce({
      access_token: 'shpat_refreshed',
      scope: 'write_products',
      expires_in: 3600,
      refresh_token: 'shprt_refreshed',
      refresh_token_expires_in: 7776000,
    });

    const session = await service.getValidSession(SHOP);
    expect(session?.accessToken).toBe('shpat_refreshed');

    const body = (global.fetch as jest.Mock).mock.calls[0][1]
      .body as URLSearchParams;
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('shprt_old');
  });

  it('getValidSession dùng token cũ khi chưa gần hết hạn (không gọi fetch)', async () => {
    await seed(storage, {
      accessToken: 'shpat_valid',
      expires: new Date(Date.now() + 3_600_000), // còn 1h
      refreshToken: 'shprt_x',
    });

    const session = await service.getValidSession(SHOP);
    expect(session?.accessToken).toBe('shpat_valid');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('getValidSession trả null khi không có session', async () => {
    expect(await service.getValidSession(SHOP)).toBeNull();
  });

  it('getValidSession trả null khi hết hạn nhưng thiếu refresh_token', async () => {
    await seed(storage, {
      expires: new Date(Date.now() + 10_000),
      refreshToken: null,
    });
    expect(await service.getValidSession(SHOP)).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

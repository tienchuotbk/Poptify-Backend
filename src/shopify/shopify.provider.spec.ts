import { ConfigService } from '@nestjs/config';
import { buildShopifyApi } from './shopify.provider';

function configStub(map: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string) => map[key],
    getOrThrow: (key: string) => {
      const value = map[key];
      if (value == null) {
        throw new Error(`missing ${key}`);
      }
      return value;
    },
  } as unknown as ConfigService;
}

describe('buildShopifyApi (task 2.1)', () => {
  const base: Record<string, string> = {
    NODE_ENV: 'test',
    SHOPIFY_API_KEY: 'test-api-key',
    SHOPIFY_API_SECRET: 'test-api-secret',
    SHOPIFY_SCOPES: 'read_products,read_orders',
    APP_URL: 'https://example.myshopify.test',
    SHOPIFY_API_VERSION: '2026-04',
  };

  it('pins apiVersion + apiKey from config', () => {
    const shopify = buildShopifyApi(configStub(base)) as unknown as {
      config: { apiVersion: string; apiKey: string };
    };
    expect(shopify.config.apiVersion).toBe('2026-04');
    expect(shopify.config.apiKey).toBe('test-api-key');
  });

  it('parses scopes from the comma-separated list', () => {
    // Dùng 2 scope độc lập: Shopify nén scope implied (write_X implies read_X).
    const shopify = buildShopifyApi(configStub(base)) as unknown as {
      config: { scopes?: { toArray?: () => string[] } | string[] };
    };
    const scopes = shopify.config.scopes;
    const arr =
      scopes && !Array.isArray(scopes) && typeof scopes.toArray === 'function'
        ? scopes.toArray()
        : scopes;
    expect(arr).toEqual(['read_products', 'read_orders']);
  });
});

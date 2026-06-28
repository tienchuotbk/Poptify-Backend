import '../shopify-adapter';
import { ApiVersion, LogSeverity, shopifyApi } from '@shopify/shopify-api';
import { ShopifyApi } from '../shopify.constants';

/** Instance @shopify/shopify-api dùng cho test (log tắt). */
export function buildTestShopify(): ShopifyApi {
  return shopifyApi({
    apiKey: 'test-api-key',
    apiSecretKey: 'test-api-secret',
    scopes: ['read_products'],
    hostName: 'example.myshopify.test',
    apiVersion: ApiVersion.April26,
    isEmbeddedApp: true,
    logger: { level: LogSeverity.Error },
  });
}

import './shopify-adapter';
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiVersion, LogSeverity, shopifyApi } from '@shopify/shopify-api';
import { SHOPIFY_API, ShopifyApi } from './shopify.constants';

/**
 * Build instance `@shopify/shopify-api` từ config (1 chỗ duy nhất).
 * apiVersion lấy từ env `SHOPIFY_API_VERSION` (default 2026-04). isEmbeddedApp=true (D1/D5).
 */
export function buildShopifyApi(config: ConfigService): ShopifyApi {
  const isTest = config.get<string>('NODE_ENV') === 'test';

  return shopifyApi({
    apiKey: config.getOrThrow<string>('SHOPIFY_API_KEY'),
    apiSecretKey: config.getOrThrow<string>('SHOPIFY_API_SECRET'),
    scopes: config
      .getOrThrow<string>('SHOPIFY_SCOPES')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    hostName: new URL(config.getOrThrow<string>('APP_URL')).host,
    apiVersion: (config.get<string>('SHOPIFY_API_VERSION') ??
      ApiVersion.April26) as ApiVersion,
    isEmbeddedApp: true,
    logger: { level: isTest ? LogSeverity.Error : LogSeverity.Info },
  });
}

export const shopifyApiProvider: Provider = {
  provide: SHOPIFY_API,
  inject: [ConfigService],
  useFactory: buildShopifyApi,
};

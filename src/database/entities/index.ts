import { ProcessedWebhookEntity } from './processed-webhook.entity';
import { ShopEntity } from './shop.entity';
import { ShopifySessionEntity } from './shopify-session.entity';

export { ProcessedWebhookEntity } from './processed-webhook.entity';
export { ShopEntity } from './shop.entity';
export { ShopifySessionEntity } from './shopify-session.entity';

/** Danh sách entity dùng chung cho DataSource (runtime) và DatabaseModule. */
export const entities = [
  ShopifySessionEntity,
  ShopEntity,
  ProcessedWebhookEntity,
];

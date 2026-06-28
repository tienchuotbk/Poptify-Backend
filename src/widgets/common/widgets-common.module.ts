import { Module } from '@nestjs/common';
import { MetafieldPublisherService } from './metafield-publisher.service';
import { WidgetProjectionService } from './widget-projection.service';
import { WidgetResolverService } from './widget-resolver.service';

/**
 * Hạ tầng dùng chung cho 3 module widget (Popup/Bar/Slider) — task 6.3-6.6.
 * Resolver (gate+schedule), Projection (whitelist), Publisher (metafield).
 * SHOPIFY_API / SessionStorage / AdminGraphql đến từ ShopifyModule (@Global).
 */
@Module({
  providers: [
    WidgetResolverService,
    WidgetProjectionService,
    MetafieldPublisherService,
  ],
  exports: [
    WidgetResolverService,
    WidgetProjectionService,
    MetafieldPublisherService,
  ],
})
export class WidgetsCommonModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessedWebhookEntity } from '../database/entities/processed-webhook.entity';
import { ShopEntity } from '../database/entities/shop.entity';
import { AppUninstalledHandler } from './handlers/app-uninstalled.handler';
import { WebhookController } from './webhook.controller';
import { WebhookHmacGuard } from './webhook-hmac.guard';
import { WebhookIdempotencyService } from './webhook-idempotency.service';

/** Webhook layer (Phase 3). TypeormSessionStorage đến từ ShopifyModule (@Global). */
@Module({
  imports: [TypeOrmModule.forFeature([ProcessedWebhookEntity, ShopEntity])],
  controllers: [WebhookController],
  providers: [
    WebhookHmacGuard,
    WebhookIdempotencyService,
    AppUninstalledHandler,
  ],
})
export class WebhookModule {}

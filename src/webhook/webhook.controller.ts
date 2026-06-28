import { Controller, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AppUninstalledHandler } from './handlers/app-uninstalled.handler';
import { WebhookHmacGuard } from './webhook-hmac.guard';
import { WebhookIdempotencyService } from './webhook-idempotency.service';

/**
 * Endpoint nhận webhook Shopify (task 3.2/3.4).
 * Thứ tự: HMAC (guard) → dedup (idempotency) → process → ack 200 nhanh (<5s).
 */
@Controller('webhooks')
@UseGuards(WebhookHmacGuard)
export class WebhookController {
  constructor(
    private readonly idempotency: WebhookIdempotencyService,
    private readonly appUninstalled: AppUninstalledHandler,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Headers('x-shopify-topic') topic?: string,
    @Headers('x-shopify-webhook-id') webhookId?: string,
    @Headers('x-shopify-shop-domain') shopDomain?: string,
  ): Promise<{ received: boolean }> {
    if (!topic || !webhookId) {
      return { received: true };
    }

    const isNew = await this.idempotency.registerIfNew(webhookId, topic);
    if (!isNew) {
      return { received: true }; // đã xử lý — không lặp lại (idempotent)
    }

    try {
      await this.dispatch(topic, shopDomain);
    } catch (error) {
      // Xử lý fail: nhả lock dedup rồi rethrow → Shopify retry cùng webhookId
      // sẽ được xử lý lại (tránh mất event vĩnh viễn).
      await this.idempotency.release(webhookId);
      throw error;
    }
    return { received: true };
  }

  private async dispatch(topic: string, shopDomain?: string): Promise<void> {
    if (topic === 'app/uninstalled' && shopDomain) {
      await this.appUninstalled.handle(shopDomain);
    }
    // Các topic khác: ack 200 (chưa có handler). Queue offload cho xử lý nặng: Q8.
  }
}

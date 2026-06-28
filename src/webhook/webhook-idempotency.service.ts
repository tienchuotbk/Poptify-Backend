import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ProcessedWebhookEntity } from '../database/entities/processed-webhook.entity';

/**
 * Idempotency cho webhook (task 3.2). Dedup bằng `X-Shopify-Webhook-Id` (unique,
 * persisted). Insert-as-lock: nếu insert được → mới (xử lý); dup → bỏ qua.
 */
@Injectable()
export class WebhookIdempotencyService {
  constructor(
    @InjectRepository(ProcessedWebhookEntity)
    private readonly repo: Repository<ProcessedWebhookEntity>,
  ) {}

  /** true = lần đầu (hãy xử lý); false = đã xử lý trước đó (bỏ qua). */
  async registerIfNew(webhookId: string, topic: string): Promise<boolean> {
    try {
      await this.repo.insert({ webhookId, topic });
      return true;
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        /unique|duplicate/i.test(error.message)
      ) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Nhả lock dedup khi xử lý FAIL — để Shopify retry (cùng webhookId) được xử
   * lý lại thay vì bị `registerIfNew` nuốt mất (idempotency-vs-processing).
   */
  async release(webhookId: string): Promise<void> {
    await this.repo.delete({ webhookId });
  }
}

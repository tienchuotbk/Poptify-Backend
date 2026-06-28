import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Idempotency cho webhook. `webhookId` = `X-Shopify-Webhook-Id` (unique) —
 * dedup persisted (đa instance / restart-safe). Dùng ở task 3.2 theo thứ tự
 * verify HMAC → dedup → process.
 */
@Entity('processed_webhooks')
export class ProcessedWebhookEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  webhookId: string;

  @Column({ type: 'varchar', length: 255 })
  topic: string;

  @CreateDateColumn({ type: 'datetime' })
  processedAt: Date;
}

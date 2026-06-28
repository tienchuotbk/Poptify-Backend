import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { tokenEncryptionTransformer } from '../../shopify/session/token-encryption';

/**
 * Lưu Shopify session (D3: offline token). Các cột khớp shape `Session` của
 * `@shopify/shopify-api` (id, shop, state, isOnline, scope, expires, accessToken,
 * onlineAccessInfo). Mapping Session class <-> entity ở task 2.2 (SessionStorage).
 * accessToken được mã hóa at-rest qua transformer (task 2.5).
 */
@Entity('shopify_sessions')
export class ShopifySessionEntity {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  shop: string;

  @Column({ type: 'varchar', length: 255 })
  state: string;

  @Column({ type: 'boolean', default: false })
  isOnline: boolean;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  scope?: string | null;

  @Column({ type: 'datetime', nullable: true })
  expires?: Date | null;

  @Column({
    type: 'text',
    nullable: true,
    transformer: tokenEncryptionTransformer,
  })
  accessToken?: string | null;

  // JSON-serialized OnlineAccessInfo; null cho offline session.
  @Column({ type: 'text', nullable: true })
  onlineAccessInfo?: string | null;
}

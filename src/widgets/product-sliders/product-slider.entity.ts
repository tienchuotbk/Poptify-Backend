import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductSliderSourceType } from './product-slider.enums';

/**
 * Product Slider config (task 10.1). Cùng pattern Popup/Bar: scope `shop`, index
 * `(shop,enabled)`, `publicId` uuid công khai, cột render lưu `simple-json`.
 * `sourceConfig` lưu **reference** (productIds / collectionId) — KHÔNG copy product
 * data; theme extension/Liquid resolve khi render.
 */
@Entity('product_sliders')
@Index(['shop', 'enabled'])
export class ProductSliderEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 36 })
  publicId: string;

  @Column({ type: 'varchar', length: 255 })
  shop: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'varchar', length: 32 })
  sourceType: ProductSliderSourceType;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'int', default: 1 })
  schemaVersion: number;

  @Column({ type: 'simple-json', nullable: true })
  sourceConfig?: unknown;

  @Column({ type: 'simple-json', nullable: true })
  layoutConfig?: unknown;

  @Column({ type: 'simple-json', nullable: true })
  behaviorConfig?: unknown;

  @Column({ type: 'simple-json', nullable: true })
  displayConfig?: unknown;

  @Column({ type: 'simple-json', nullable: true })
  placementConfig?: unknown;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;

  @BeforeInsert()
  assignPublicId(): void {
    if (!this.publicId) {
      this.publicId = randomUUID();
    }
  }
}

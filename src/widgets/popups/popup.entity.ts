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
import { PopupType } from './popup.enums';

/**
 * Popup config (task 7.1). Scope theo `shop` (domain) — index `(shop, enabled)`
 * cho query delivery. Cột render-only lưu `simple-json` (portable MySQL + sqljs;
 * validate ở DTO, không query vào trong). `schemaVersion` stamp sẵn cho versioning
 * sau này (chưa build transform engine).
 */
@Entity('popups')
@Index(['shop', 'enabled'])
export class PopupEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Handle công khai (uuid) cho client (theme extension) tham chiếu popup ổn định
   * — vd frequency-capping. Phơi cái này thay cho PK numeric nội bộ (tránh leak
   * count/ordering). Sinh app-level qua @BeforeInsert (portable MySQL + sqljs).
   */
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
  type: PopupType;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'int', default: 1 })
  schemaVersion: number;

  @Column({ type: 'simple-json', nullable: true })
  triggerConfig?: unknown;

  @Column({ type: 'simple-json', nullable: true })
  frequencyConfig?: unknown;

  @Column({ type: 'simple-json', nullable: true })
  targetPages?: string[] | null;

  @Column({ type: 'simple-json', nullable: true })
  designConfig?: unknown;

  @Column({ type: 'simple-json', nullable: true })
  contentConfig?: unknown;

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

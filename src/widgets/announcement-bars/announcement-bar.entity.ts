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
import {
  AnnouncementBarPosition,
  AnnouncementBarType,
} from './announcement-bar.enums';

/**
 * Announcement Bar config (task 9.1). Cùng pattern PopupEntity: scope `shop`,
 * index `(shop,enabled)`, `publicId` uuid công khai (ẩn PK numeric), cột render
 * lưu `simple-json`.
 */
@Entity('announcement_bars')
@Index(['shop', 'enabled'])
export class AnnouncementBarEntity {
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
  type: AnnouncementBarType;

  @Column({ type: 'varchar', length: 16, default: AnnouncementBarPosition.Top })
  position: AnnouncementBarPosition;

  @Column({ type: 'boolean', default: false })
  sticky: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'int', default: 1 })
  schemaVersion: number;

  @Column({ type: 'simple-json', nullable: true })
  contentConfig?: unknown;

  @Column({ type: 'simple-json', nullable: true })
  styleConfig?: unknown;

  @Column({ type: 'simple-json', nullable: true })
  visibilityRules?: unknown;

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

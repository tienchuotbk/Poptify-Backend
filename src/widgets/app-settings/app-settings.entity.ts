import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DeviceTarget, PageTarget } from '../common/dto/targeting.dto';

/**
 * Global App Settings — 1 record/shop (task 8.1). Công tắc tổng (`appEnabled`) +
 * targeting mặc định + schedule. `shop` unique. Tạo default lúc first-access.
 */
@Entity('app_settings')
export class AppSettingsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  shop: string;

  @Column({ type: 'boolean', default: false })
  appEnabled: boolean;

  @Column({ type: 'varchar', length: 16, default: DeviceTarget.All })
  deviceTarget: DeviceTarget;

  @Column({ type: 'varchar', length: 16, default: PageTarget.All })
  globalPageTarget: PageTarget;

  @Column({ type: 'datetime', nullable: true })
  startDate?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  endDate?: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  timezone?: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}

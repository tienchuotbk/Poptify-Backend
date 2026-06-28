import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 1 record / shop. Cập nhật khi install (Token Exchange — task 2.4) và khi
 * `app/uninstalled` webhook đến (task 3.3).
 */
@Entity('shops')
export class ShopEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  shop: string;

  @Column({ type: 'boolean', default: false })
  installed: boolean;

  @Column({ type: 'datetime', nullable: true })
  installedAt?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  uninstalledAt?: Date | null;
}

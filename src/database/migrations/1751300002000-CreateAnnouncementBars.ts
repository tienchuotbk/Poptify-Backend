import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Feature migration (task 9.1) — bảng `announcement_bars`. Cùng pattern popups.
 * Verify up/down trên MySQL CI.
 */
export class CreateAnnouncementBars1751300002000 implements MigrationInterface {
  name = 'CreateAnnouncementBars1751300002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `announcement_bars` (' +
        '`id` int NOT NULL AUTO_INCREMENT, ' +
        '`publicId` varchar(36) NOT NULL, ' +
        '`shop` varchar(255) NOT NULL, ' +
        '`name` varchar(255) NOT NULL, ' +
        '`enabled` tinyint NOT NULL DEFAULT 0, ' +
        '`type` varchar(32) NOT NULL, ' +
        "`position` varchar(16) NOT NULL DEFAULT 'top', " +
        '`sticky` tinyint NOT NULL DEFAULT 0, ' +
        '`priority` int NOT NULL DEFAULT 0, ' +
        '`schemaVersion` int NOT NULL DEFAULT 1, ' +
        '`contentConfig` text NULL, ' +
        '`styleConfig` text NULL, ' +
        '`visibilityRules` text NULL, ' +
        '`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
        '`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, ' +
        'UNIQUE INDEX `IDX_announcement_bars_publicId` (`publicId`), ' +
        'PRIMARY KEY (`id`)' +
        ') ENGINE=InnoDB',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_announcement_bars_shop_enabled` ON `announcement_bars` (`shop`, `enabled`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_announcement_bars_shop_enabled` ON `announcement_bars`',
    );
    await queryRunner.query('DROP TABLE `announcement_bars`');
  }
}

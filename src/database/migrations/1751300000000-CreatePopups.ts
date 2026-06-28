import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Feature migration (task 7.1) — bảng `popups`.
 * Cột render-only (`*Config`, `targetPages`) là `text` (simple-json: text + JSON
 * ở app layer). Scope theo `shop` (domain) với index `(shop, enabled)`.
 * Verify up/down trên MySQL CI.
 */
export class CreatePopups1751300000000 implements MigrationInterface {
  name = 'CreatePopups1751300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `popups` (' +
        '`id` int NOT NULL AUTO_INCREMENT, ' +
        '`publicId` varchar(36) NOT NULL, ' +
        '`shop` varchar(255) NOT NULL, ' +
        '`name` varchar(255) NOT NULL, ' +
        '`enabled` tinyint NOT NULL DEFAULT 0, ' +
        '`type` varchar(32) NOT NULL, ' +
        '`priority` int NOT NULL DEFAULT 0, ' +
        '`schemaVersion` int NOT NULL DEFAULT 1, ' +
        '`triggerConfig` text NULL, ' +
        '`frequencyConfig` text NULL, ' +
        '`targetPages` text NULL, ' +
        '`designConfig` text NULL, ' +
        '`contentConfig` text NULL, ' +
        '`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
        '`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, ' +
        'UNIQUE INDEX `IDX_popups_publicId` (`publicId`), ' +
        'PRIMARY KEY (`id`)' +
        ') ENGINE=InnoDB',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_popups_shop_enabled` ON `popups` (`shop`, `enabled`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_popups_shop_enabled` ON `popups`');
    await queryRunner.query('DROP TABLE `popups`');
  }
}

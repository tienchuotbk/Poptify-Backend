import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Feature migration (task 10.1) — bảng `product_sliders`. Cùng pattern popups/bars.
 * Verify up/down trên MySQL CI.
 */
export class CreateProductSliders1751300003000 implements MigrationInterface {
  name = 'CreateProductSliders1751300003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `product_sliders` (' +
        '`id` int NOT NULL AUTO_INCREMENT, ' +
        '`publicId` varchar(36) NOT NULL, ' +
        '`shop` varchar(255) NOT NULL, ' +
        '`name` varchar(255) NOT NULL, ' +
        '`enabled` tinyint NOT NULL DEFAULT 0, ' +
        '`sourceType` varchar(32) NOT NULL, ' +
        '`priority` int NOT NULL DEFAULT 0, ' +
        '`schemaVersion` int NOT NULL DEFAULT 1, ' +
        '`sourceConfig` text NULL, ' +
        '`layoutConfig` text NULL, ' +
        '`behaviorConfig` text NULL, ' +
        '`displayConfig` text NULL, ' +
        '`placementConfig` text NULL, ' +
        '`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
        '`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, ' +
        'UNIQUE INDEX `IDX_product_sliders_publicId` (`publicId`), ' +
        'PRIMARY KEY (`id`)' +
        ') ENGINE=InnoDB',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_product_sliders_shop_enabled` ON `product_sliders` (`shop`, `enabled`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_product_sliders_shop_enabled` ON `product_sliders`',
    );
    await queryRunner.query('DROP TABLE `product_sliders`');
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Feature migration (task 8.1) — bảng `app_settings` (1 record/shop, `shop` unique).
 * Verify up/down trên MySQL CI.
 */
export class CreateAppSettings1751300001000 implements MigrationInterface {
  name = 'CreateAppSettings1751300001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `app_settings` (' +
        '`id` int NOT NULL AUTO_INCREMENT, ' +
        '`shop` varchar(255) NOT NULL, ' +
        '`appEnabled` tinyint NOT NULL DEFAULT 0, ' +
        "`deviceTarget` varchar(16) NOT NULL DEFAULT 'all', " +
        "`globalPageTarget` varchar(16) NOT NULL DEFAULT 'all', " +
        '`startDate` datetime NULL, ' +
        '`endDate` datetime NULL, ' +
        '`timezone` varchar(64) NULL, ' +
        '`createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
        '`updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, ' +
        'UNIQUE INDEX `IDX_app_settings_shop` (`shop`), ' +
        'PRIMARY KEY (`id`)' +
        ') ENGINE=InnoDB',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `app_settings`');
  }
}

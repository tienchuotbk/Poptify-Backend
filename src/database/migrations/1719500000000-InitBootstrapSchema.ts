import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline migration (task 6.1 / 1.5) — tạo một lần cho cả 3 entity bootstrap:
 * `shopify_sessions`, `shops`, `processed_webhooks`. Phải khớp chính xác entity
 * (synchronize:false ở MySQL → migration là nguồn schema duy nhất).
 *
 * DDL viết tay theo quy ước TypeORM MySQL (boolean → tinyint, datetime, AUTO_INCREMENT).
 * Verify migrate up/down trên MySQL service container ở CI (task 4.5/11.2).
 *
 * Lưu ý: index/unique giữ đúng ngữ nghĩa runtime — đặc biệt UNIQUE trên
 * `processed_webhooks.webhookId` (idempotency insert-as-lock dựa vào unique-violation)
 * và UNIQUE trên `shops.shop`.
 */
export class InitBootstrapSchema1719500000000 implements MigrationInterface {
  name = 'InitBootstrapSchema1719500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `shopify_sessions` (' +
        '`id` varchar(255) NOT NULL, ' +
        '`shop` varchar(255) NOT NULL, ' +
        '`state` varchar(255) NOT NULL, ' +
        '`isOnline` tinyint NOT NULL DEFAULT 0, ' +
        '`scope` varchar(1024) NULL, ' +
        '`expires` datetime NULL, ' +
        '`accessToken` text NULL, ' +
        '`onlineAccessInfo` text NULL, ' +
        'PRIMARY KEY (`id`)' +
        ') ENGINE=InnoDB',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_shopify_sessions_shop` ON `shopify_sessions` (`shop`)',
    );

    await queryRunner.query(
      'CREATE TABLE `shops` (' +
        '`id` int NOT NULL AUTO_INCREMENT, ' +
        '`shop` varchar(255) NOT NULL, ' +
        '`installed` tinyint NOT NULL DEFAULT 0, ' +
        '`installedAt` datetime NULL, ' +
        '`uninstalledAt` datetime NULL, ' +
        'UNIQUE INDEX `IDX_shops_shop` (`shop`), ' +
        'PRIMARY KEY (`id`)' +
        ') ENGINE=InnoDB',
    );

    await queryRunner.query(
      'CREATE TABLE `processed_webhooks` (' +
        '`id` int NOT NULL AUTO_INCREMENT, ' +
        '`webhookId` varchar(255) NOT NULL, ' +
        '`topic` varchar(255) NOT NULL, ' +
        '`processedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, ' +
        'UNIQUE INDEX `IDX_processed_webhooks_webhookId` (`webhookId`), ' +
        'PRIMARY KEY (`id`)' +
        ') ENGINE=InnoDB',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop ngược thứ tự tạo; DROP TABLE tự bỏ index đi kèm.
    await queryRunner.query('DROP TABLE `processed_webhooks`');
    await queryRunner.query('DROP TABLE `shops`');
    await queryRunner.query(
      'DROP INDEX `IDX_shopify_sessions_shop` ON `shopify_sessions`',
    );
    await queryRunner.query('DROP TABLE `shopify_sessions`');
  }
}

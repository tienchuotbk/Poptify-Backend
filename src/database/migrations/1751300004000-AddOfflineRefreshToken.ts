import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Thêm cột cho expiring offline token (12/2025): `refreshToken` (mã hóa at-rest) +
 * `refreshTokenExpires`. Token cũ (non-expiring) để NULL — vẫn dùng được tới khi
 * merchant mở lại app và lấy expiring token mới. synchronize tắt ở MySQL nên cần
 * migration này; sqljs test tự sync từ entity.
 */
export class AddOfflineRefreshToken1751300004000 implements MigrationInterface {
  name = 'AddOfflineRefreshToken1751300004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `shopify_sessions` ADD `refreshToken` text NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `shopify_sessions` ADD `refreshTokenExpires` datetime NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `shopify_sessions` DROP COLUMN `refreshTokenExpires`',
    );
    await queryRunner.query(
      'ALTER TABLE `shopify_sessions` DROP COLUMN `refreshToken`',
    );
  }
}

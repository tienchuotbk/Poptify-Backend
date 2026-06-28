import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WidgetsCommonModule } from '../common/widgets-common.module';
import { AppSettingsController } from './app-settings.controller';
import { AppSettingsEntity } from './app-settings.entity';
import { AppSettingsService } from './app-settings.service';

/**
 * Global App Settings (Phase 8). Export `AppSettingsService` để widget module
 * khác đọc activity state (gate publish). Re-publish khi đổi qua event bus
 * (không import ngược widget module → tránh circular dep).
 */
@Module({
  imports: [TypeOrmModule.forFeature([AppSettingsEntity]), WidgetsCommonModule],
  controllers: [AppSettingsController],
  providers: [AppSettingsService],
  exports: [AppSettingsService],
})
export class AppSettingsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSettingsModule } from '../app-settings/app-settings.module';
import { WidgetsCommonModule } from '../common/widgets-common.module';
import { PopupEntity } from './popup.entity';
import { PopupsController } from './popups.controller';
import { PopupsService } from './popups.service';

/** Module CRUD + publish cho Popup (Phase 7). Đọc AppSettings để gate publish. */
@Module({
  imports: [
    TypeOrmModule.forFeature([PopupEntity]),
    WidgetsCommonModule,
    AppSettingsModule,
  ],
  controllers: [PopupsController],
  providers: [PopupsService],
})
export class PopupsModule {}

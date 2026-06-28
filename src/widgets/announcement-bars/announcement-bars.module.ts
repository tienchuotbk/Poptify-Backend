import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSettingsModule } from '../app-settings/app-settings.module';
import { WidgetsCommonModule } from '../common/widgets-common.module';
import { AnnouncementBarEntity } from './announcement-bar.entity';
import { AnnouncementBarsController } from './announcement-bars.controller';
import { AnnouncementBarsService } from './announcement-bars.service';

/** Module CRUD + publish cho Announcement Bar (Phase 9). */
@Module({
  imports: [
    TypeOrmModule.forFeature([AnnouncementBarEntity]),
    WidgetsCommonModule,
    AppSettingsModule,
  ],
  controllers: [AnnouncementBarsController],
  providers: [AnnouncementBarsService],
})
export class AnnouncementBarsModule {}

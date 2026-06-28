import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import {
  APP_SETTINGS_CHANGED,
  AppSettingsChangedEvent,
} from '../common/app-settings-changed.event';
import { MetafieldPublisherService } from '../common/metafield-publisher.service';
import { AppActivityState } from '../common/widget-resolver.service';
import { DeviceTarget, PageTarget } from '../common/dto/targeting.dto';
import { AppSettingsEntity } from './app-settings.entity';
import { toPublicAppSettings } from './app-settings.projection';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';

const SETTINGS_METAFIELD_KEY = 'settings';

@Injectable()
export class AppSettingsService {
  private readonly logger = new Logger(AppSettingsService.name);

  constructor(
    @InjectRepository(AppSettingsEntity)
    private readonly repo: Repository<AppSettingsEntity>,
    private readonly publisher: MetafieldPublisherService,
    private readonly events: EventEmitter2,
  ) {}

  /** Lấy settings của shop, tạo default lúc first-access (idempotent concurrent). */
  async getOrCreate(shop: string): Promise<AppSettingsEntity> {
    const existing = await this.repo.findOneBy({ shop });
    if (existing) {
      return existing;
    }
    try {
      return await this.repo.save(
        this.repo.create({
          shop,
          appEnabled: false,
          deviceTarget: DeviceTarget.All,
          globalPageTarget: PageTarget.All,
        }),
      );
    } catch (error) {
      // Race: 2 request first-access đồng thời → unique violation → re-fetch.
      if (
        error instanceof QueryFailedError &&
        /unique|duplicate/i.test(error.message)
      ) {
        const row = await this.repo.findOneBy({ shop });
        if (row) {
          return row;
        }
      }
      throw error;
    }
  }

  get(shop: string): Promise<AppSettingsEntity> {
    return this.getOrCreate(shop);
  }

  /** State để gate publish widget (gate `app_enabled` + schedule). */
  async getActivityState(shop: string): Promise<AppActivityState> {
    const s = await this.getOrCreate(shop);
    return {
      appEnabled: s.appEnabled,
      startDate: s.startDate ?? null,
      endDate: s.endDate ?? null,
    };
  }

  async update(
    shop: string,
    dto: UpdateAppSettingsDto,
  ): Promise<AppSettingsEntity> {
    const settings = await this.getOrCreate(shop);

    if (dto.appEnabled !== undefined) {
      settings.appEnabled = dto.appEnabled;
    }
    if (dto.deviceTarget !== undefined) {
      settings.deviceTarget = dto.deviceTarget;
    }
    if (dto.globalPageTarget !== undefined) {
      settings.globalPageTarget = dto.globalPageTarget;
    }
    if (dto.schedule !== undefined) {
      settings.startDate = dto.schedule.startDate
        ? new Date(dto.schedule.startDate)
        : null;
      settings.endDate = dto.schedule.endDate
        ? new Date(dto.schedule.endDate)
        : null;
      settings.timezone = dto.schedule.timezone ?? null;
    }

    const saved = await this.repo.save(settings);
    await this.publishSettings(shop, saved);
    // Báo widget module re-publish theo state mới (vd app off → publish rỗng).
    // emitAsync để đợi listener xong (metafield đồng bộ trước khi PUT trả về).
    await this.events.emitAsync(
      APP_SETTINGS_CHANGED,
      new AppSettingsChangedEvent(shop),
    );
    return saved;
  }

  private async publishSettings(
    shop: string,
    entity: AppSettingsEntity,
  ): Promise<void> {
    try {
      await this.publisher.publish(
        shop,
        SETTINGS_METAFIELD_KEY,
        toPublicAppSettings(entity),
      );
    } catch (error) {
      this.logger.error(
        `Publish metafield settings thất bại cho ${shop}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

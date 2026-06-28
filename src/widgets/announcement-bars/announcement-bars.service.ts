import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSettingsService } from '../app-settings/app-settings.service';
import {
  APP_SETTINGS_CHANGED,
  AppSettingsChangedEvent,
} from '../common/app-settings-changed.event';
import { MetafieldPublisherService } from '../common/metafield-publisher.service';
import { WidgetProjectionService } from '../common/widget-projection.service';
import { AnnouncementBarEntity } from './announcement-bar.entity';
import { toPublicAnnouncementBar } from './announcement-bar.projection';
import { CreateAnnouncementBarDto } from './dto/create-announcement-bar.dto';
import { UpdateAnnouncementBarDto } from './dto/update-announcement-bar.dto';

const BARS_METAFIELD_KEY = 'bars';

@Injectable()
export class AnnouncementBarsService {
  private readonly logger = new Logger(AnnouncementBarsService.name);

  constructor(
    @InjectRepository(AnnouncementBarEntity)
    private readonly repo: Repository<AnnouncementBarEntity>,
    private readonly projection: WidgetProjectionService,
    private readonly publisher: MetafieldPublisherService,
    private readonly appSettings: AppSettingsService,
  ) {}

  @OnEvent(APP_SETTINGS_CHANGED)
  async onAppSettingsChanged(payload: AppSettingsChangedEvent): Promise<void> {
    await this.republish(payload.shop);
  }

  list(shop: string): Promise<AnnouncementBarEntity[]> {
    return this.repo.find({
      where: { shop },
      order: { priority: 'ASC', createdAt: 'ASC', id: 'ASC' },
    });
  }

  async get(shop: string, id: number): Promise<AnnouncementBarEntity> {
    const bar = await this.repo.findOneBy({ shop, id });
    if (!bar) {
      throw new NotFoundException('Announcement bar không tồn tại');
    }
    return bar;
  }

  async create(
    shop: string,
    dto: CreateAnnouncementBarDto,
  ): Promise<AnnouncementBarEntity> {
    const bar = await this.repo.save(this.repo.create({ ...dto, shop }));
    await this.republish(shop);
    return bar;
  }

  async update(
    shop: string,
    id: number,
    dto: UpdateAnnouncementBarDto,
  ): Promise<AnnouncementBarEntity> {
    const bar = await this.get(shop, id);
    Object.assign(bar, dto);
    const saved = await this.repo.save(bar);
    await this.republish(shop);
    return saved;
  }

  async remove(shop: string, id: number): Promise<void> {
    const result = await this.repo.delete({ shop, id });
    if (!result.affected) {
      throw new NotFoundException('Announcement bar không tồn tại');
    }
    await this.republish(shop);
  }

  /** Publish toàn bộ bar enabled của shop lên metafield key `bars` (gate AppSettings). */
  private async republish(shop: string): Promise<void> {
    try {
      const bars = await this.repo.find({
        where: { shop },
        order: { priority: 'ASC', createdAt: 'ASC', id: 'ASC' },
      });
      const state = await this.appSettings.getActivityState(shop);
      const projected = this.projection.project(
        state,
        bars,
        toPublicAnnouncementBar,
      );
      await this.publisher.publish(shop, BARS_METAFIELD_KEY, {
        bars: projected,
      });
    } catch (error) {
      this.logger.error(
        `Publish metafield bars thất bại cho ${shop}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

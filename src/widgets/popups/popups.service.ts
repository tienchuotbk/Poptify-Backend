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
import { CreatePopupDto } from './dto/create-popup.dto';
import { UpdatePopupDto } from './dto/update-popup.dto';
import { PopupEntity } from './popup.entity';
import { toPublicPopup } from './popup.projection';

/** Key metafield cho module popup (namespace mặc định `$app`). */
const POPUPS_METAFIELD_KEY = 'popups';

@Injectable()
export class PopupsService {
  private readonly logger = new Logger(PopupsService.name);

  constructor(
    @InjectRepository(PopupEntity)
    private readonly repo: Repository<PopupEntity>,
    private readonly projection: WidgetProjectionService,
    private readonly publisher: MetafieldPublisherService,
    private readonly appSettings: AppSettingsService,
  ) {}

  /** App settings đổi (vd app_enabled toggle) → re-publish theo state mới. */
  @OnEvent(APP_SETTINGS_CHANGED)
  async onAppSettingsChanged(payload: AppSettingsChangedEvent): Promise<void> {
    await this.republish(payload.shop);
  }

  /** Mọi query scope theo `shop` (từ session đã verify) — chống IDOR. */
  list(shop: string): Promise<PopupEntity[]> {
    return this.repo.find({
      where: { shop },
      order: { priority: 'ASC', createdAt: 'ASC', id: 'ASC' },
    });
  }

  async get(shop: string, id: number): Promise<PopupEntity> {
    const popup = await this.repo.findOneBy({ shop, id });
    if (!popup) {
      // 404 (không 403) → không lộ tồn tại resource của shop khác.
      throw new NotFoundException('Popup không tồn tại');
    }
    return popup;
  }

  async create(shop: string, dto: CreatePopupDto): Promise<PopupEntity> {
    const popup = await this.repo.save(this.repo.create({ ...dto, shop }));
    await this.republish(shop);
    return popup;
  }

  async update(
    shop: string,
    id: number,
    dto: UpdatePopupDto,
  ): Promise<PopupEntity> {
    const popup = await this.get(shop, id); // ném 404 nếu của shop khác
    Object.assign(popup, dto);
    const saved = await this.repo.save(popup);
    await this.republish(shop);
    return saved;
  }

  async remove(shop: string, id: number): Promise<void> {
    const result = await this.repo.delete({ shop, id });
    if (!result.affected) {
      throw new NotFoundException('Popup không tồn tại');
    }
    await this.republish(shop);
  }

  /**
   * Dựng projection toàn bộ popup của shop và publish lên metafield key `popups`.
   * Lỗi publish KHÔNG làm fail CRUD (DB là SoT; lần mutate sau sẽ re-publish) —
   * chỉ log. Gate state lấy từ AppSettings thật (Phase 8).
   */
  private async republish(shop: string): Promise<void> {
    try {
      const popups = await this.repo.find({
        where: { shop },
        order: { priority: 'ASC', createdAt: 'ASC', id: 'ASC' },
      });
      // Gate theo AppSettings thật (app_enabled + schedule) — app off → rỗng.
      const state = await this.appSettings.getActivityState(shop);
      const projected = this.projection.project(state, popups, toPublicPopup);
      await this.publisher.publish(shop, POPUPS_METAFIELD_KEY, {
        popups: projected,
      });
    } catch (error) {
      this.logger.error(
        `Publish metafield popups thất bại cho ${shop}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

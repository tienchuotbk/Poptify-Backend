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
import { CreateProductSliderDto } from './dto/create-product-slider.dto';
import { UpdateProductSliderDto } from './dto/update-product-slider.dto';
import { ProductSliderEntity } from './product-slider.entity';
import { toPublicProductSlider } from './product-slider.projection';

const SLIDERS_METAFIELD_KEY = 'sliders';

@Injectable()
export class ProductSlidersService {
  private readonly logger = new Logger(ProductSlidersService.name);

  constructor(
    @InjectRepository(ProductSliderEntity)
    private readonly repo: Repository<ProductSliderEntity>,
    private readonly projection: WidgetProjectionService,
    private readonly publisher: MetafieldPublisherService,
    private readonly appSettings: AppSettingsService,
  ) {}

  @OnEvent(APP_SETTINGS_CHANGED)
  async onAppSettingsChanged(payload: AppSettingsChangedEvent): Promise<void> {
    await this.republish(payload.shop);
  }

  list(shop: string): Promise<ProductSliderEntity[]> {
    return this.repo.find({
      where: { shop },
      order: { priority: 'ASC', createdAt: 'ASC', id: 'ASC' },
    });
  }

  async get(shop: string, id: number): Promise<ProductSliderEntity> {
    const slider = await this.repo.findOneBy({ shop, id });
    if (!slider) {
      throw new NotFoundException('Product slider không tồn tại');
    }
    return slider;
  }

  async create(
    shop: string,
    dto: CreateProductSliderDto,
  ): Promise<ProductSliderEntity> {
    const slider = await this.repo.save(this.repo.create({ ...dto, shop }));
    await this.republish(shop);
    return slider;
  }

  async update(
    shop: string,
    id: number,
    dto: UpdateProductSliderDto,
  ): Promise<ProductSliderEntity> {
    const slider = await this.get(shop, id);
    Object.assign(slider, dto);
    const saved = await this.repo.save(slider);
    await this.republish(shop);
    return saved;
  }

  async remove(shop: string, id: number): Promise<void> {
    const result = await this.repo.delete({ shop, id });
    if (!result.affected) {
      throw new NotFoundException('Product slider không tồn tại');
    }
    await this.republish(shop);
  }

  /**
   * Publish slider enabled của shop lên metafield `sliders` (gate AppSettings).
   * Lưu reference (productIds/collectionId) nguyên trạng — product_ids rỗng /
   * collection bị xóa KHÔNG gây lỗi (Liquid render graceful khi resolve).
   */
  private async republish(shop: string): Promise<void> {
    try {
      const sliders = await this.repo.find({
        where: { shop },
        order: { priority: 'ASC', createdAt: 'ASC', id: 'ASC' },
      });
      const state = await this.appSettings.getActivityState(shop);
      const projected = this.projection.project(
        state,
        sliders,
        toPublicProductSlider,
      );
      await this.publisher.publish(shop, SLIDERS_METAFIELD_KEY, {
        sliders: projected,
      });
    } catch (error) {
      this.logger.error(
        `Publish metafield sliders thất bại cho ${shop}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

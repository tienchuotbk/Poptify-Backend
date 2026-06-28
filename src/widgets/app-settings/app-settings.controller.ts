import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SessionTokenGuard } from '../../shopify/auth/session-token.guard';
import { CurrentShop } from '../common/current-shop.decorator';
import { AppSettingsEntity } from './app-settings.entity';
import { AppSettingsService } from './app-settings.service';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';

/**
 * Global App Settings (task 8.2). 1 record/shop; shop từ `@CurrentShop()`
 * (session verify). GET tạo default lúc first-access; PUT upsert.
 */
@Controller('api/app-settings')
@UseGuards(SessionTokenGuard)
export class AppSettingsController {
  constructor(private readonly settings: AppSettingsService) {}

  @Get()
  get(@CurrentShop() shop: string): Promise<AppSettingsEntity> {
    return this.settings.get(shop);
  }

  @Put()
  update(
    @CurrentShop() shop: string,
    @Body() dto: UpdateAppSettingsDto,
  ): Promise<AppSettingsEntity> {
    return this.settings.update(shop, dto);
  }
}

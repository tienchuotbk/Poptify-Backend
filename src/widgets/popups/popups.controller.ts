import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SessionTokenGuard } from '../../shopify/auth/session-token.guard';
import { CurrentShop } from '../common/current-shop.decorator';
import { CreatePopupDto } from './dto/create-popup.dto';
import { UpdatePopupDto } from './dto/update-popup.dto';
import { PopupEntity } from './popup.entity';
import { PopupsService } from './popups.service';

/**
 * Admin CRUD cho Popup (task 7.3). Bảo vệ bằng `SessionTokenGuard`; shop lấy từ
 * `@CurrentShop()` (session đã verify) — KHÔNG nhận shop từ body (anti-IDOR).
 */
@Controller('api/popups')
@UseGuards(SessionTokenGuard)
export class PopupsController {
  constructor(private readonly popups: PopupsService) {}

  @Get()
  list(@CurrentShop() shop: string): Promise<PopupEntity[]> {
    return this.popups.list(shop);
  }

  @Post()
  create(
    @CurrentShop() shop: string,
    @Body() dto: CreatePopupDto,
  ): Promise<PopupEntity> {
    return this.popups.create(shop, dto);
  }

  @Get(':id')
  get(
    @CurrentShop() shop: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PopupEntity> {
    return this.popups.get(shop, id);
  }

  @Patch(':id')
  update(
    @CurrentShop() shop: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePopupDto,
  ): Promise<PopupEntity> {
    return this.popups.update(shop, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentShop() shop: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.popups.remove(shop, id);
  }
}

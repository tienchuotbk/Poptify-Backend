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
import { AnnouncementBarEntity } from './announcement-bar.entity';
import { AnnouncementBarsService } from './announcement-bars.service';
import { CreateAnnouncementBarDto } from './dto/create-announcement-bar.dto';
import { UpdateAnnouncementBarDto } from './dto/update-announcement-bar.dto';

/** Admin CRUD cho Announcement Bar (task 9.3). Shop từ `@CurrentShop()` (anti-IDOR). */
@Controller('api/announcement-bars')
@UseGuards(SessionTokenGuard)
export class AnnouncementBarsController {
  constructor(private readonly bars: AnnouncementBarsService) {}

  @Get()
  list(@CurrentShop() shop: string): Promise<AnnouncementBarEntity[]> {
    return this.bars.list(shop);
  }

  @Post()
  create(
    @CurrentShop() shop: string,
    @Body() dto: CreateAnnouncementBarDto,
  ): Promise<AnnouncementBarEntity> {
    return this.bars.create(shop, dto);
  }

  @Get(':id')
  get(
    @CurrentShop() shop: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AnnouncementBarEntity> {
    return this.bars.get(shop, id);
  }

  @Patch(':id')
  update(
    @CurrentShop() shop: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAnnouncementBarDto,
  ): Promise<AnnouncementBarEntity> {
    return this.bars.update(shop, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentShop() shop: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.bars.remove(shop, id);
  }
}

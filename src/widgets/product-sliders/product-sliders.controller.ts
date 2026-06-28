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
import { CreateProductSliderDto } from './dto/create-product-slider.dto';
import { UpdateProductSliderDto } from './dto/update-product-slider.dto';
import { ProductSliderEntity } from './product-slider.entity';
import { ProductSlidersService } from './product-sliders.service';

/** Admin CRUD cho Product Slider (task 10.3). Shop từ `@CurrentShop()` (anti-IDOR). */
@Controller('api/product-sliders')
@UseGuards(SessionTokenGuard)
export class ProductSlidersController {
  constructor(private readonly sliders: ProductSlidersService) {}

  @Get()
  list(@CurrentShop() shop: string): Promise<ProductSliderEntity[]> {
    return this.sliders.list(shop);
  }

  @Post()
  create(
    @CurrentShop() shop: string,
    @Body() dto: CreateProductSliderDto,
  ): Promise<ProductSliderEntity> {
    return this.sliders.create(shop, dto);
  }

  @Get(':id')
  get(
    @CurrentShop() shop: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProductSliderEntity> {
    return this.sliders.get(shop, id);
  }

  @Patch(':id')
  update(
    @CurrentShop() shop: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductSliderDto,
  ): Promise<ProductSliderEntity> {
    return this.sliders.update(shop, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentShop() shop: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.sliders.remove(shop, id);
  }
}

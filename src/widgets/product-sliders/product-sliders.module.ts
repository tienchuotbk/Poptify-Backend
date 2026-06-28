import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSettingsModule } from '../app-settings/app-settings.module';
import { WidgetsCommonModule } from '../common/widgets-common.module';
import { ProductSliderEntity } from './product-slider.entity';
import { ProductSlidersController } from './product-sliders.controller';
import { ProductSlidersService } from './product-sliders.service';

/** Module CRUD + publish cho Product Slider (Phase 10). */
@Module({
  imports: [
    TypeOrmModule.forFeature([ProductSliderEntity]),
    WidgetsCommonModule,
    AppSettingsModule,
  ],
  controllers: [ProductSlidersController],
  providers: [ProductSlidersService],
})
export class ProductSlidersModule {}

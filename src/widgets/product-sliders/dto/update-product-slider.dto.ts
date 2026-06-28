import { PartialType } from '@nestjs/mapped-types';
import { CreateProductSliderDto } from './create-product-slider.dto';

export class UpdateProductSliderDto extends PartialType(
  CreateProductSliderDto,
) {}

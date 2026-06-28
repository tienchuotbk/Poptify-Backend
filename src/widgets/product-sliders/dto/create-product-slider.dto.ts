import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PageTarget } from '../../common/dto/targeting.dto';
import { StripTags } from '../../common/sanitize';
import {
  ProductSliderPlacement,
  ProductSliderSourceType,
} from '../product-slider.enums';

// CSS selector allow-list: chữ/số + ký tự selector hợp lệ. CẤM `<` (chống tag/XSS
// injection); `>` được giữ vì là CSS child combinator hợp lệ (vd `.a > .b`).
const SELECTOR_RE = /^[a-zA-Z0-9 ._#>[\]="':-]+$/;

class SliderSourceConfigDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  productIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  collectionId?: string;
}

class SliderLayoutConfigDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  desktopItems?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  tabletItems?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  mobileItems?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  rows?: number;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  spacing?: string;
}

class SliderBehaviorConfigDto {
  @IsOptional()
  @IsBoolean()
  autoplay?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60000)
  autoplaySpeed?: number;

  @IsOptional()
  @IsBoolean()
  infiniteLoop?: boolean;

  @IsOptional()
  @IsBoolean()
  showArrows?: boolean;

  @IsOptional()
  @IsBoolean()
  showDots?: boolean;
}

class SliderDisplayConfigDto {
  @IsOptional() @IsBoolean() showImage?: boolean;
  @IsOptional() @IsBoolean() showTitle?: boolean;
  @IsOptional() @IsBoolean() showPrice?: boolean;
  @IsOptional() @IsBoolean() showComparePrice?: boolean;
  @IsOptional() @IsBoolean() showAddToCart?: boolean;
  @IsOptional() @IsBoolean() showSaleBadge?: boolean;
}

class SliderPlacementConfigDto {
  @IsOptional()
  @IsArray()
  @IsEnum(PageTarget, { each: true })
  targetPages?: PageTarget[];

  @IsOptional()
  @IsEnum(ProductSliderPlacement)
  placementPosition?: ProductSliderPlacement;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Matches(SELECTOR_RE, { message: 'customSelector chứa ký tự không hợp lệ' })
  customSelector?: string;
}

export class CreateProductSliderDto {
  @StripTags()
  @IsString()
  @MaxLength(255)
  name: string;

  // best_sellers đã cắt (D10) → chỉ featured/collection; giá trị khác → 400.
  @IsEnum(ProductSliderSourceType)
  sourceType: ProductSliderSourceType;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => SliderSourceConfigDto)
  sourceConfig?: SliderSourceConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SliderLayoutConfigDto)
  layoutConfig?: SliderLayoutConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SliderBehaviorConfigDto)
  behaviorConfig?: SliderBehaviorConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SliderDisplayConfigDto)
  displayConfig?: SliderDisplayConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SliderPlacementConfigDto)
  placementConfig?: SliderPlacementConfigDto;
}

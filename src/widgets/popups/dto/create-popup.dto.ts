import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PageTarget } from '../../common/dto/targeting.dto';
import { StripTags } from '../../common/sanitize';
import {
  PopupFrequency,
  PopupPosition,
  PopupTriggerType,
  PopupType,
} from '../popup.enums';

/** URL chỉ chấp nhận https (chặn javascript:/data:/vbscript:) + cap length. */
const HTTPS_URL_OPTS = { protocols: ['https'], require_protocol: true };

class TriggerConfigDto {
  @IsEnum(PopupTriggerType)
  type: PopupTriggerType;

  // vd "5" (giây) / "30" (%). null cho page_load/exit_intent.
  @IsOptional()
  @IsString()
  @MaxLength(16)
  value?: string;
}

class FrequencyConfigDto {
  @IsEnum(PopupFrequency)
  frequency: PopupFrequency;
}

class DesignConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(16)
  width?: string;

  @IsOptional()
  @IsEnum(PopupPosition)
  position?: PopupPosition;

  @IsOptional()
  @IsHexColor()
  backgroundColor?: string;

  @IsOptional()
  @IsHexColor()
  textColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  borderRadius?: string;

  @IsOptional()
  @IsUrl(HTTPS_URL_OPTS)
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  showCloseButton?: boolean;
}

/**
 * Content gộp cho cả 3 type (discount/newsletter/exit_intent). Field optional;
 * presence theo type do FE quyết định. Discount = **text-only** (`couponCode`
 * merchant tự nhập — KHÔNG sinh mã thật, D9). Newsletter **không** field email
 * (chưa thu email round này, D9) — chỉ cấu hình hiển thị.
 */
class ContentConfigDto {
  @IsOptional()
  @StripTags()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @StripTags()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @StripTags()
  @IsString()
  @MaxLength(64)
  couponCode?: string;

  @IsOptional()
  @StripTags()
  @IsString()
  @MaxLength(64)
  buttonText?: string;

  @IsOptional()
  @IsUrl(HTTPS_URL_OPTS)
  @MaxLength(2048)
  buttonLink?: string;

  // Newsletter (config hiển thị; KHÔNG lưu email submit).
  @IsOptional()
  @IsBoolean()
  emailInputEnabled?: boolean;

  @IsOptional()
  @StripTags()
  @IsString()
  @MaxLength(64)
  submitButtonText?: string;

  @IsOptional()
  @StripTags()
  @IsString()
  @MaxLength(255)
  successMessage?: string;
}

export class CreatePopupDto {
  @StripTags()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsEnum(PopupType)
  type: PopupType;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => TriggerConfigDto)
  triggerConfig?: TriggerConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FrequencyConfigDto)
  frequencyConfig?: FrequencyConfigDto;

  @IsOptional()
  @IsArray()
  @IsEnum(PageTarget, { each: true })
  targetPages?: PageTarget[];

  @IsOptional()
  @ValidateNested()
  @Type(() => DesignConfigDto)
  designConfig?: DesignConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContentConfigDto)
  contentConfig?: ContentConfigDto;
}

import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsHexColor,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PageTarget, DeviceTarget } from '../../common/dto/targeting.dto';
import { StripTags } from '../../common/sanitize';
import {
  AnnouncementBarPosition,
  AnnouncementBarType,
} from '../announcement-bar.enums';

const HTTPS_URL_OPTS = { protocols: ['https'], require_protocol: true };
const ISO_INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Content gộp cho 3 type bar:
 * - simple: text, buttonText, buttonLink
 * - countdown: text, endDate, expiredMessage
 * - free_shipping_progress: goalAmount, progressText, successText
 * Field optional; presence theo type do FE quyết định.
 */
class BarContentConfigDto {
  @IsOptional()
  @StripTags()
  @IsString()
  @MaxLength(500)
  text?: string;

  @IsOptional()
  @StripTags()
  @IsString()
  @MaxLength(64)
  buttonText?: string;

  @IsOptional()
  @IsUrl(HTTPS_URL_OPTS)
  @MaxLength(2048)
  buttonLink?: string;

  // countdown
  @IsOptional()
  @IsString()
  @Matches(ISO_INSTANT, { message: 'endDate phải là ISO-8601 instant' })
  endDate?: string;

  @IsOptional()
  @StripTags()
  @IsString()
  @MaxLength(255)
  expiredMessage?: string;

  // free_shipping_progress
  @IsOptional()
  @IsNumber()
  @Min(0)
  goalAmount?: number;

  @IsOptional()
  @StripTags()
  @IsString()
  @MaxLength(255)
  progressText?: string;

  @IsOptional()
  @StripTags()
  @IsString()
  @MaxLength(255)
  successText?: string;
}

class BarStyleConfigDto {
  @IsOptional()
  @IsHexColor()
  backgroundColor?: string;

  @IsOptional()
  @IsHexColor()
  textColor?: string;

  @IsOptional()
  @StripTags()
  @IsString()
  @MaxLength(16)
  fontSize?: string;

  @IsOptional()
  @StripTags()
  @IsString()
  @MaxLength(16)
  height?: string;
}

class BarVisibilityRulesDto {
  @IsOptional()
  @IsEnum(DeviceTarget)
  deviceTarget?: DeviceTarget;

  @IsOptional()
  @IsArray()
  @IsEnum(PageTarget, { each: true })
  targetPages?: PageTarget[];
}

export class CreateAnnouncementBarDto {
  @StripTags()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsEnum(AnnouncementBarType)
  type: AnnouncementBarType;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsEnum(AnnouncementBarPosition)
  position?: AnnouncementBarPosition;

  @IsOptional()
  @IsBoolean()
  sticky?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => BarContentConfigDto)
  contentConfig?: BarContentConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BarStyleConfigDto)
  styleConfig?: BarStyleConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BarVisibilityRulesDto)
  visibilityRules?: BarVisibilityRulesDto;
}

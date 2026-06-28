import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** Thiết bị áp dụng widget (spec brief: Global App Settings). */
export enum DeviceTarget {
  All = 'all',
  Desktop = 'desktop',
  Mobile = 'mobile',
}

/** Loại trang storefront áp dụng widget. */
export enum PageTarget {
  All = 'all',
  Homepage = 'homepage',
  Product = 'product',
  Collection = 'collection',
  Cart = 'cart',
}

/**
 * Lịch hiển thị (value-object). `startDate`/`endDate` là ISO-8601 instant (UTC);
 * FE quy đổi từ wall-clock của merchant sang UTC trước khi gửi. `timezone` là
 * metadata cho client render (vd countdown) — backend so sánh theo absolute instant.
 */
export class ScheduleDto {
  @IsOptional()
  @IsString()
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
    {
      message: 'startDate phải là ISO-8601 instant',
    },
  )
  startDate?: string;

  @IsOptional()
  @IsString()
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
    {
      message: 'endDate phải là ISO-8601 instant',
    },
  )
  endDate?: string;

  // IANA timezone (vd "Asia/Ho_Chi_Minh"); chỉ metadata.
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(
    /^[A-Za-z]+(?:[_+-][A-Za-z0-9]+)*(?:\/[A-Za-z0-9]+(?:[_+-][A-Za-z0-9]+)*)*$/,
    {
      message: 'timezone không hợp lệ',
    },
  )
  timezone?: string;
}

/** Targeting dùng chung cho widget (device + danh sách page). */
export class TargetingDto {
  @IsOptional()
  @IsEnum(DeviceTarget)
  deviceTarget?: DeviceTarget;

  @IsOptional()
  @IsArray()
  @IsEnum(PageTarget, { each: true })
  targetPages?: PageTarget[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleDto)
  schedule?: ScheduleDto;
}

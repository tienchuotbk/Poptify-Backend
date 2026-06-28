import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import {
  DeviceTarget,
  PageTarget,
  ScheduleDto,
} from '../../common/dto/targeting.dto';

/** PUT body cho Global App Settings (task 8.2). Mọi field optional (partial). */
export class UpdateAppSettingsDto {
  @IsOptional()
  @IsBoolean()
  appEnabled?: boolean;

  @IsOptional()
  @IsEnum(DeviceTarget)
  deviceTarget?: DeviceTarget;

  @IsOptional()
  @IsEnum(PageTarget)
  globalPageTarget?: PageTarget;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleDto)
  schedule?: ScheduleDto;
}

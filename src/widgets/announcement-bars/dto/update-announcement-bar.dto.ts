import { PartialType } from '@nestjs/mapped-types';
import { CreateAnnouncementBarDto } from './create-announcement-bar.dto';

export class UpdateAnnouncementBarDto extends PartialType(
  CreateAnnouncementBarDto,
) {}

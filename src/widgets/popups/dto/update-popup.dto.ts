import { PartialType } from '@nestjs/mapped-types';
import { CreatePopupDto } from './create-popup.dto';

/** Update = mọi field của Create thành optional (PATCH partial). */
export class UpdatePopupDto extends PartialType(CreatePopupDto) {}

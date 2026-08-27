import { PartialType } from '@nestjs/swagger';
import { CreateBriefDto } from './create-brief.dto';

/**
 * Every field is optional; only the provided fields are updated. A new
 * `productImageKey` (temp upload key) replaces the current product image.
 */
export class UpdateBriefDto extends PartialType(CreateBriefDto) {}

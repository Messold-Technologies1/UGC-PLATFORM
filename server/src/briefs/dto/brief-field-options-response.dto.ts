import { ApiProperty } from '@nestjs/swagger';
import {
  BriefContentType,
  BriefDurationBucket,
  BriefShootLocationKind,
  BriefToneStyle,
} from '@prisma/client';

export class BriefFieldOptionsResponseDto {
  @ApiProperty({ enum: BriefShootLocationKind, isArray: true })
  shootLocationKinds!: BriefShootLocationKind[];

  @ApiProperty({ enum: BriefDurationBucket, isArray: true })
  durationBuckets!: BriefDurationBucket[];

  @ApiProperty({ enum: BriefContentType, isArray: true })
  contentTypes!: BriefContentType[];

  @ApiProperty({ enum: BriefToneStyle, isArray: true })
  toneStyles!: BriefToneStyle[];
}

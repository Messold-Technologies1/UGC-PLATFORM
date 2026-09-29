import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationChannel } from '@prisma/client';

/** 14 days, the longest offset the drips use. */
export const MAX_OFFSET_MINUTES = 20160;

export class UpdateEventDto {
  @ApiPropertyOptional({ description: 'Turn the whole event on or off.' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Email template used when a row sets no override.',
  })
  @IsOptional()
  @IsUUID()
  emailTemplateId?: string | null;

  @ApiPropertyOptional({
    description:
      'Meta template name. Must match a template approved in WhatsApp Manager; Meta requires ^[a-z0-9_]+$.',
    example: 'order_brief_submitted_for_creator',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'whatsappTemplateName must match ^[a-z0-9_]+$ — that is what Meta accepts.',
  })
  @MaxLength(512)
  whatsappTemplateName?: string | null;
}

export class ScheduleRowDto {
  @ApiProperty({
    description: '0 sends immediately. 30 = +30min, 1440 = +24h.',
    example: 0,
  })
  @IsInt()
  @Min(0)
  @Max(MAX_OFFSET_MINUTES)
  offsetMinutes!: number;

  @ApiProperty({ enum: NotificationChannel, isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsEnum(NotificationChannel, { each: true })
  channels!: NotificationChannel[];

  @ApiPropertyOptional({
    description: 'Overrides the event email template for this row.',
  })
  @IsOptional()
  @IsUUID()
  templateOverrideId?: string | null;

  @ApiPropertyOptional({
    description: 'Overrides the event WhatsApp template for this row.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9_]+$/)
  whatsappTemplateOverride?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReplaceScheduleDto {
  @ApiProperty({ type: () => [ScheduleRowDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ScheduleRowDto)
  rows!: ScheduleRowDto[];
}

export class SaveTemplateDto {
  @ApiProperty({ example: 'order-brief-submitted-for-creator' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  subjectHbs!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  htmlHbs!: string;

  @ApiPropertyOptional({
    description: 'Null derives the plain-text part from the HTML.',
  })
  @IsOptional()
  @IsString()
  textHbs?: string | null;

  @ApiPropertyOptional({ description: 'Shown in the version history.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string | null;
}

export class PreviewTemplateDto {
  @ApiPropertyOptional({
    description:
      'Render with this event’s declared examples. Omit to use whatever the template references.',
  })
  @IsOptional()
  @IsString()
  eventKey?: string;
}

export class BackfillDto {
  @ApiProperty({
    description: 'Apply this row to entities that fired the event recently.',
  })
  @IsInt()
  @Min(1)
  @Max(MAX_OFFSET_MINUTES)
  offsetMinutes!: number;

  @ApiPropertyOptional({
    description: 'How far back to look, in days.',
    default: 7,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  withinDays?: number;

  @ApiPropertyOptional({
    description: 'Report the count without enqueueing anything.',
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

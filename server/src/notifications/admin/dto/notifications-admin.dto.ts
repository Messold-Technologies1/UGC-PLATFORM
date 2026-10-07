import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
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

  @ApiPropertyOptional({
    description:
      'Required unless bodyDoc is sent, in which case the server renders it.',
  })
  @ValidateIf((o: SaveTemplateDto) => o.bodyDoc === undefined)
  @IsString()
  @MinLength(1)
  htmlHbs!: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description:
      'The visual editor document. When present it is the source of truth: the ' +
      'server renders htmlHbs from it and ignores any htmlHbs sent alongside.',
  })
  @IsOptional()
  @IsObject()
  bodyDoc?: Record<string, unknown>;

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

  @ApiPropertyOptional({
    description:
      'Unsaved subject to render instead of the stored one. Send the draft ' +
      'fields together so the editor can preview edits before they are saved.',
  })
  @IsOptional()
  @IsString()
  subjectHbs?: string;

  @ApiPropertyOptional({ description: 'Unsaved HTML body to render.' })
  @IsOptional()
  @IsString()
  htmlHbs?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description:
      'Unsaved visual-editor document. Takes precedence over htmlHbs, so the ' +
      'preview shows exactly what a save would store.',
  })
  @IsOptional()
  @IsObject()
  bodyDoc?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Unsaved plain text. Null or omitted derives it from the HTML.',
  })
  @IsOptional()
  @IsString()
  textHbs?: string | null;
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

export class DeriveTextDto {
  @ApiProperty({ description: 'The HTML body template to derive text from.' })
  @IsString()
  @MinLength(1)
  htmlHbs!: string;
}

export class PreviewDraftDto {
  @ApiProperty({ description: 'The name being typed; resolves the variables.' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventKey?: string;

  @ApiProperty()
  @IsString()
  subjectHbs!: string;

  @ApiPropertyOptional({ description: 'Required unless bodyDoc is sent.' })
  @ValidateIf((o: PreviewDraftDto) => o.bodyDoc === undefined)
  @IsString()
  @MinLength(1)
  htmlHbs!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  bodyDoc?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textHbs?: string | null;
}

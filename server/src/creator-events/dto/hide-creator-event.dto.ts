import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class HideCreatorEventDto {
  @ApiPropertyOptional({
    maxLength: 200,
    example: 'Off-platform solicitation',
    description:
      'Why the post was hidden. Stored with the admin who hid it, and read back in the admin table.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(200)
  reason?: string;
}

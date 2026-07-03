import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectDraftDto {
  @ApiPropertyOptional({
    example: 'Please add the cookie policy link in Section 11.',
    description: 'Optional reviewer feedback sent back to the draft author.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reviewNote?: string;
}

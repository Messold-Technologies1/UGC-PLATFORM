import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestRevisionDto {
  @ApiPropertyOptional({
    description: 'Feedback explaining what changes are needed',
    maxLength: 2000,
    example: 'Please reshoot the product close-up with better lighting.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

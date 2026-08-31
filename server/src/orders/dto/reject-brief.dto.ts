import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectBriefDto {
  @ApiProperty({
    description: 'Reason the creator is rejecting the brief (required)',
    maxLength: 2000,
    example: 'This brief is outside my content niche.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  note!: string;
}

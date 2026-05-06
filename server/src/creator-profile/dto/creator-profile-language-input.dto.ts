import { ApiProperty } from '@nestjs/swagger';
import { CreatorLanguageFluency } from '@prisma/client';
import { IsEnum, IsString, Matches } from 'class-validator';

export class CreatorProfileLanguageInputDto {
  @ApiProperty({ example: 'english' })
  @IsString()
  @Matches(/^[a-z0-9_]+$/)
  slug!: string;

  @ApiProperty({ enum: CreatorLanguageFluency })
  @IsEnum(CreatorLanguageFluency)
  fluency!: CreatorLanguageFluency;
}

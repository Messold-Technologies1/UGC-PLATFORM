import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class CreatorProfileLanguageInputDto {
  @ApiProperty({ example: 'english' })
  @IsString()
  @Matches(/^[a-z0-9_]+$/)
  slug!: string;
}

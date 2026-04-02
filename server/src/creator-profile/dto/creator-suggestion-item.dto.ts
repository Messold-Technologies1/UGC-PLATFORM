import { ApiProperty } from '@nestjs/swagger';

export class CreatorSuggestionItemDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Clean aesthetic' })
  name!: string;
}


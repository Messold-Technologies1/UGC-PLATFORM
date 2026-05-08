import { ApiProperty } from '@nestjs/swagger';

export class CreateBriefResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;
}


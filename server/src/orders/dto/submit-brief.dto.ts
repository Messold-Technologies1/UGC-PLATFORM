import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SubmitBriefDto {
  @ApiProperty({
    description:
      'Link an existing saved brief to this order (briefs are reusable by brand).',
    example: 'uuid',
  })
  @IsUUID()
  briefId!: string;
}


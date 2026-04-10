import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class SubmitBriefDto {
  @ApiProperty({
    description:
      'Campaign brief payload. Stored as JSON on the order (schema-free for now).',
    example: {
      brandName: 'Acme',
      product: 'Skincare',
      talkingPoints: ['Hydration', 'SPF'],
    },
  })
  @IsObject()
  brief!: Record<string, unknown>;
}


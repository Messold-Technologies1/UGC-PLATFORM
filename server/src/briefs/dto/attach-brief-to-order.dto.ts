import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AttachBriefToOrderDto {
  @ApiProperty({
    description: 'Order to attach this saved brief to',
    example: 'uuid',
  })
  @IsUUID()
  orderId!: string;
}

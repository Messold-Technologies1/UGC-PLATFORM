import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({
    description: 'Reason the brand is cancelling the order (required)',
    maxLength: 2000,
    example: 'We no longer need this collaboration.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  note!: string;
}

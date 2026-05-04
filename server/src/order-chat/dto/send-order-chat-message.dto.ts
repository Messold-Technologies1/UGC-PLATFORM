import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendOrderChatMessageDto {
  @ApiProperty({ minLength: 1, maxLength: 5000 })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text!: string;

  @ApiPropertyOptional({
    description:
      'Client-generated id for idempotent retries (same sender + order).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  clientMessageId?: string;
}


import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MarkOrderChatReadDto {
  @ApiProperty({ description: 'The latest message id the user has read.' })
  @IsString()
  lastReadMessageId!: string;
}


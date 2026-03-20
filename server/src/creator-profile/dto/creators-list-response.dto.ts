import { ApiProperty } from '@nestjs/swagger';
import { CreatorProfileResponseDto } from './creator-profile-response.dto';

export class CreatorsListResponseDto {
  @ApiProperty({ type: () => [CreatorProfileResponseDto] })
  items!: CreatorProfileResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}

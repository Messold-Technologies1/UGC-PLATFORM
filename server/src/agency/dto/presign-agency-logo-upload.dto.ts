import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, Min } from 'class-validator';

export class PresignAgencyLogoUploadDto {
  @ApiProperty({ example: 'image/png' })
  @IsString()
  contentType!: string;

  @ApiProperty({ example: 2_000_000 })
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  contentLength!: number;
}

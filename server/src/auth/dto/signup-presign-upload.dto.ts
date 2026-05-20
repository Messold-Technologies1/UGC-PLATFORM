import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class SignupPresignUploadDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  contentType!: string;

  @ApiProperty({ example: 50_000_000 })
  @IsInt()
  @Min(1)
  contentLength!: number;
}

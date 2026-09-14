import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password!: string;

  @ApiPropertyOptional({
    enum: RoleName,
    example: RoleName.CREATOR,
    description:
      'Optional. When omitted, the workspace role is detected from the email ' +
      "(the account's primary role). When provided, it must match that role. " +
      'The unified login screen omits this so one form serves every role.',
  })
  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;
}

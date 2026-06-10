import { ApiProperty } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password!: string;

  @ApiProperty({
    enum: RoleName,
    example: RoleName.CREATOR,
    description:
      'Registration account type; must match the user primary workspace role',
  })
  @IsEnum(RoleName)
  role!: RoleName;
}

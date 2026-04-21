import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RemoveBrandRoleDto {
  @ApiPropertyOptional({ example: 'Removed from admin brand management' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

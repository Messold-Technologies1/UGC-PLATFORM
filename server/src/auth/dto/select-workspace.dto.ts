import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export const WORKSPACE_ROLE_VALUES = ['CREATOR', 'BRAND'] as const;

export type WorkspaceRoleInput = (typeof WORKSPACE_ROLE_VALUES)[number];

export class SelectWorkspaceDto {
  @ApiProperty({ enum: WORKSPACE_ROLE_VALUES })
  @IsIn(WORKSPACE_ROLE_VALUES)
  role!: WorkspaceRoleInput;

  @ApiPropertyOptional({
    default: false,
    description:
      'If true, also updates the user primaryRole (cross-session default).',
  })
  @IsOptional()
  @IsBoolean()
  setPrimary?: boolean;
}

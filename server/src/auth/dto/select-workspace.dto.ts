import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const WORKSPACE_ROLE_VALUES = ['CREATOR', 'BRAND'] as const;

export type WorkspaceRoleInput = (typeof WORKSPACE_ROLE_VALUES)[number];

export class SelectWorkspaceDto {
  @ApiProperty({ enum: WORKSPACE_ROLE_VALUES })
  @IsIn(WORKSPACE_ROLE_VALUES)
  role!: WorkspaceRoleInput;
}

import { SetMetadata } from '@nestjs/common';

export type WorkspaceRole = 'CREATOR' | 'BRAND' | 'AGENCY';

export const REQUIRED_WORKSPACE_KEY = 'requiredWorkspace';

export const RequiredWorkspace = (workspace: WorkspaceRole) =>
  SetMetadata(REQUIRED_WORKSPACE_KEY, workspace);

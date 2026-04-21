import { GUARDS_METADATA } from '@nestjs/common/constants';
import { BrandProfileController } from '../brand-profile/brand-profile.controller';
import { CreatorPortfolioController } from '../creator-portfolio/creator-portfolio.controller';
import { CreatorProfileController } from '../creator-profile/creator-profile.controller';
import { OrdersController } from '../orders/orders.controller';
import { REQUIRED_WORKSPACE_KEY } from './decorators/required-workspace.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { WorkspacePermissionGuard } from './guards/workspace-permission.guard';

function methodTarget(
  controller: Record<string, unknown>,
  methodName: string,
): object {
  return controller[methodName] as object;
}

function requiredWorkspaceFor(
  controller: Record<string, unknown>,
  methodName: string,
): string | undefined {
  return Reflect.getMetadata(
    REQUIRED_WORKSPACE_KEY,
    methodTarget(controller, methodName),
  ) as string | undefined;
}

function guardsFor(
  controller: Record<string, unknown>,
  methodName: string,
): unknown[] {
  return (
    (Reflect.getMetadata(
      GUARDS_METADATA,
      methodTarget(controller, methodName),
    ) as unknown[] | undefined) ?? []
  );
}

describe('Request-scoped workspace routes', () => {
  it('protects brand-only read routes with brand workspace metadata', () => {
    const controller = BrandProfileController.prototype as unknown as Record<
      string,
      unknown
    >;

    expect(requiredWorkspaceFor(controller, 'getMyBrandProfile')).toBe('BRAND');
    expect(guardsFor(controller, 'getMyBrandProfile')).toEqual([
      JwtAuthGuard,
      WorkspacePermissionGuard,
    ]);
  });

  it('leaves brand onboarding routes authenticated-only so profile creation can grant the role', () => {
    const controller = BrandProfileController.prototype as unknown as Record<
      string,
      unknown
    >;

    expect(
      requiredWorkspaceFor(controller, 'createBrandProfile'),
    ).toBeUndefined();
    expect(
      requiredWorkspaceFor(controller, 'presignBrandLogoUpload'),
    ).toBeUndefined();
    expect(guardsFor(controller, 'createBrandProfile')).toEqual([JwtAuthGuard]);
    expect(guardsFor(controller, 'presignBrandLogoUpload')).toEqual([
      JwtAuthGuard,
    ]);
  });

  it('protects creator workspace routes but keeps onboarding create/presign routes authenticated-only', () => {
    const controller = CreatorProfileController.prototype as unknown as Record<
      string,
      unknown
    >;

    expect(requiredWorkspaceFor(controller, 'getMyCreatorProfile')).toBe(
      'CREATOR',
    );
    expect(requiredWorkspaceFor(controller, 'getMyPayoutDetails')).toBe(
      'CREATOR',
    );
    expect(requiredWorkspaceFor(controller, 'upsertMyPayoutDetails')).toBe(
      'CREATOR',
    );
    expect(guardsFor(controller, 'getMyCreatorProfile')).toEqual([
      JwtAuthGuard,
      WorkspacePermissionGuard,
    ]);
    expect(requiredWorkspaceFor(controller, 'createProfile')).toBeUndefined();
    expect(
      requiredWorkspaceFor(controller, 'presignProfileImageUpload'),
    ).toBeUndefined();
    expect(guardsFor(controller, 'createProfile')).toEqual([JwtAuthGuard]);
    expect(guardsFor(controller, 'presignProfileImageUpload')).toEqual([
      JwtAuthGuard,
    ]);
  });

  it('protects creator-owned portfolio mutations with creator workspace metadata', () => {
    const controller =
      CreatorPortfolioController.prototype as unknown as Record<
        string,
        unknown
      >;

    for (const methodName of [
      'presign',
      'createVideo',
      'listMyVideos',
      'updateVideo',
      'deleteVideo',
    ]) {
      expect(requiredWorkspaceFor(controller, methodName)).toBe('CREATOR');
      expect(guardsFor(controller, methodName)).toEqual([
        JwtAuthGuard,
        WorkspacePermissionGuard,
      ]);
    }
  });

  it('keeps the orders controller role split request-scoped by endpoint', () => {
    const controller = OrdersController.prototype as unknown as Record<
      string,
      unknown
    >;

    expect(requiredWorkspaceFor(controller, 'createCheckout')).toBe('BRAND');
    expect(requiredWorkspaceFor(controller, 'submitBrief')).toBe('BRAND');
    expect(requiredWorkspaceFor(controller, 'accept')).toBe('BRAND');
    expect(requiredWorkspaceFor(controller, 'openBrandDispute')).toBe('BRAND');
    expect(requiredWorkspaceFor(controller, 'deliver')).toBe('CREATOR');
    expect(requiredWorkspaceFor(controller, 'openCreatorDispute')).toBe(
      'CREATOR',
    );
  });
});

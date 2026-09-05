import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';

function createContext(email?: string): ExecutionContext {
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => ({
        user: email !== undefined ? { email } : undefined,
      }),
    }),
  };
  return ctx as unknown as ExecutionContext;
}

describe('SuperAdminGuard', () => {
  const guard = new SuperAdminGuard();

  it('allows designated super-admin emails', () => {
    expect(guard.canActivate(createContext('anuj@messold.com'))).toBe(true);
    expect(guard.canActivate(createContext('bipasha.roy@messold.com'))).toBe(
      true,
    );
  });

  it('rejects other admins', () => {
    expect(() =>
      guard.canActivate(createContext('other.admin@messold.com')),
    ).toThrow(ForbiddenException);
  });

  it('rejects a missing user', () => {
    expect(() => guard.canActivate(createContext())).toThrow(
      UnauthorizedException,
    );
  });
});

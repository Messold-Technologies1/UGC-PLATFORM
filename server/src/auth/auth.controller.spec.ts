import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import type { AuthService, MeUser } from './auth.service';
import type { PasswordService } from './password.service';

describe('AuthController', () => {
  const authService = {
    register: jest.fn(),
    registerCreator: jest.fn(),
    registerBrand: jest.fn(),
    registerAgency: jest.fn(),
    registerAdmin: jest.fn(),
    login: jest.fn(),
    getGoogleAuthUrl: jest.fn(),
    handleGoogleCallback: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getMeForClient: jest.fn(),
  };

  const passwordService = {
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
  };

  const config = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'FRONTEND_URL') return 'http://localhost:3000';
      if (key === 'JWT_REFRESH_EXPIRY') return '7d';
      return defaultValue;
    }),
  };

  let controller: AuthController;

  const user: MeUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    roles: ['CREATOR'],
    primaryRole: 'CREATOR',
    hasCreatorProfile: true,
    hasBrandProfile: false,
    brandAccessRevoked: false,
    hasAgencyProfile: false,
    activeBrandProfileId: null,
    accessibleBrands: [],
    canManageAdmins: false,
  };

  function createResponseMock() {
    return {
      cookie: jest.fn(),
      redirect: jest.fn(),
    } as unknown as Response;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(
      authService as unknown as AuthService,
      passwordService as unknown as PasswordService,
      config as unknown as ConfigService,
    );
  });

  it('register sets auth cookies and returns the user payload', async () => {
    authService.register.mockResolvedValue({
      user,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: '15m',
    });

    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    } as Request;
    const res = createResponseMock();

    const result = await controller.register(
      undefined,
      {
        email: user.email,
        name: user.name ?? undefined,
        password: 'password123',
      },
      req,
      res,
    );

    expect(authService.register).toHaveBeenCalled();
    expect(
      (res as unknown as { cookie: jest.Mock }).cookie,
    ).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ user });
  });

  it('login sets auth cookies and returns the user payload', async () => {
    authService.login.mockResolvedValue({
      user,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: '15m',
    });

    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    } as Request;
    const res = createResponseMock();

    const result = await controller.login(
      {
        email: user.email,
        password: 'password123',
        role: 'CREATOR',
      },
      req,
      res,
    );

    expect(authService.login).toHaveBeenCalled();
    expect(
      (res as unknown as { cookie: jest.Mock }).cookie,
    ).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ user });
  });

  it('google callback redirects with an error when code/state are missing', async () => {
    const req = {
      query: {},
      cookies: {},
    } as unknown as Request;
    const res = createResponseMock();

    await controller.googleCallback(req, res);

    expect(
      (res as unknown as { redirect: jest.Mock }).redirect,
    ).toHaveBeenCalledWith(
      'http://localhost:3000/auth/callback?error=missing_code_or_state',
    );
  });

  it('google callback sets cookies and redirects on success', async () => {
    authService.handleGoogleCallback.mockResolvedValue({
      user,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: '15m',
    });

    const req = {
      query: { code: 'code-123', state: 'state-123' },
      cookies: { oauth_state: 'state-123' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    } as unknown as Request;
    const res = createResponseMock();

    await controller.googleCallback(req, res);

    expect(authService.handleGoogleCallback).toHaveBeenCalledWith(
      'code-123',
      'state-123',
      'state-123',
      expect.objectContaining({
        ipAddress: '127.0.0.1',
      }),
      null,
    );
    expect((res as unknown as { cookie: jest.Mock }).cookie).toHaveBeenCalled();
    expect(
      (res as unknown as { redirect: jest.Mock }).redirect,
    ).toHaveBeenCalledWith('http://localhost:3000/auth/callback');
  });

  it('me returns the current user and throws when auth service returns null', async () => {
    authService.getMeForClient
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(null);

    const req = {
      user: { id: 'user-1', email: user.email, name: user.name },
    } as unknown as Request & {
      user: { id: string; email: string; name: string | null };
    };

    await expect(controller.me(req)).resolves.toEqual({ user });
    await expect(controller.me(req)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('logout clears cookies and invalidates the session when a refresh token exists', async () => {
    const req = {
      cookies: { refreshToken: 'refresh-token' },
    } as unknown as Request;
    const res = createResponseMock();

    await controller.logout(req, res);

    expect(authService.logout).toHaveBeenCalledWith('refresh-token');
    expect(
      (res as unknown as { cookie: jest.Mock }).cookie,
    ).toHaveBeenCalledTimes(2);
  });
});

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import {
  clearAuthCookies,
  clearOAuthStateCookie,
  setAuthCookies,
  setOAuthStateCookie,
  OAUTH_STATE_COOKIE,
} from './cookie-helper';
import { LoginDto } from './dto/login.dto';
import { MeUserDto } from './dto/me-user.dto';
import { RegisterDto } from './dto/register.dto';
import { SelectWorkspaceDto } from './dto/select-workspace.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { AdminGuard } from './guards/admin.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AUTH_COOKIE_NAMES, AuthService } from './auth.service';

@ApiTags('auth')
@ApiExtraModels(UserResponseDto, MeUserDto)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register with name, email, password' })
  @ApiResponse({
    status: 201,
    description:
      'Registered; tokens set in HttpOnly cookies; body returns user only',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
    const result = await this.authService.register(dto, meta);
    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      result.expiresIn,
      this.config.get<string>('JWT_REFRESH_EXPIRY', '7d'),
    );
    return { user: result.user };
  }

  @Post('register-admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an admin user (admin-only)' })
  @ApiResponse({
    status: 201,
    description: 'Admin user created',
    type: UserResponseDto,
  })
  async registerAdmin(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
    const result = await this.authService.registerAdmin(dto, meta);
    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      result.expiresIn,
      this.config.get<string>('JWT_REFRESH_EXPIRY', '7d'),
    );
    return { user: result.user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Tokens set in HttpOnly cookies; body returns user only',
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
    const result = await this.authService.login(dto, meta);
    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      result.expiresIn,
      this.config.get<string>('JWT_REFRESH_EXPIRY', '7d'),
    );
    return { user: result.user };
  }

  @Get('google')
  @ApiOperation({ summary: 'Redirect to Google OAuth' })
  @ApiResponse({ status: 302, description: 'Redirect to Google sign-in' })
  google(@Res() res: Response) {
    const state = randomBytes(32).toString('hex');
    setOAuthStateCookie(res, state);
    const url = this.authService.getGoogleAuthUrl(state);
    res.redirect(url);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({
    status: 302,
    description: 'Redirect to FRONTEND_URL/auth/callback with cookies set',
  })
  @ApiResponse({ status: 401, description: 'Invalid state or Google error' })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const storedState = req.cookies?.[OAUTH_STATE_COOKIE];

    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    clearOAuthStateCookie(res);

    if (!code || !state) {
      res.redirect(`${frontendUrl}/auth/callback?error=missing_code_or_state`);
      return;
    }

    try {
      const meta = {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      };
      const result = await this.authService.handleGoogleCallback(
        code,
        state,
        storedState,
        meta,
      );
      setAuthCookies(
        res,
        result.accessToken,
        result.refreshToken,
        result.expiresIn,
        this.config.get<string>('JWT_REFRESH_EXPIRY', '7d'),
      );
      res.redirect(`${frontendUrl}/auth/callback`);
    } catch {
      res.redirect(`${frontendUrl}/auth/callback?error=oauth_failed`);
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Refresh access token using refresh token from cookie',
  })
  @ApiResponse({ status: 204, description: 'New tokens set in cookies' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[AUTH_COOKIE_NAMES.refreshToken];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }
    const tokens = await this.authService.refresh(refreshToken);
    setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresIn,
      this.config.get<string>('JWT_REFRESH_EXPIRY', '7d'),
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Logout; invalidate session and clear auth cookies',
  })
  @ApiResponse({ status: 204, description: 'Logged out' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[AUTH_COOKIE_NAMES.refreshToken];
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    clearAuthCookies(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user and workspace state' })
  @ApiResponse({ status: 200, description: 'Current user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async me(
    @Req() req: Request & { user: { id: string; email: string; name: string | null } },
  ) {
    const refreshToken = req.cookies?.[AUTH_COOKIE_NAMES.refreshToken];
    const user = await this.authService.getMeForClient(req.user.id, refreshToken);
    if (!user) {
      throw new UnauthorizedException();
    }
    return { user };
  }

  @Post('workspace')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Select or switch workspace (creator/brand); adds role if missing',
  })
  @ApiResponse({ status: 200, description: 'Updated user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async selectWorkspace(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: SelectWorkspaceDto,
  ) {
    const refreshToken = req.cookies?.[AUTH_COOKIE_NAMES.refreshToken];
    const user = await this.authService.selectWorkspace(
      req.user.id,
      dto.role,
      dto.setPrimary ?? false,
      refreshToken,
    );
    return { user };
  }
}

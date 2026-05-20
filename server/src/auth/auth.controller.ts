import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
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
import { RegisterCreatorDto } from './dto/register-creator.dto';
import { RegisterBrandDto } from './dto/register-brand.dto';
import { RegisterAgencyDto } from './dto/register-agency.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { AdminGuard } from './guards/admin.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AUTH_COOKIE_NAMES, AuthService } from './auth.service';
import { parsePublicSignupRole, PublicSignupRole } from './public-signup-role';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

function readCookie(req: Request, name: string): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[name];
  return typeof value === 'string' ? value : undefined;
}

@ApiTags('auth')
@ApiExtraModels(
  UserResponseDto,
  MeUserDto,
  RegisterDto,
  RegisterCreatorDto,
  RegisterBrandDto,
  RegisterAgencyDto,
)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private registerMeta(req: Request): {
    ipAddress?: string;
    userAgent?: string;
  } {
    return {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    };
  }

  private completeRegister(
    result: Awaited<ReturnType<AuthService['register']>>,
    res: Response,
  ) {
    setAuthCookies(
      res,
      result.accessToken,
      result.refreshToken,
      result.expiresIn,
      this.config.get<string>('JWT_REFRESH_EXPIRY', '7d'),
    );
    return { user: result.user };
  }

  @Post('register/creator')
  @ApiOperation({
    summary: 'Register as creator (user + creator profile in one step)',
  })
  @ApiBody({ type: RegisterCreatorDto })
  @ApiResponse({
    status: 201,
    description:
      'Registered; tokens set in HttpOnly cookies; body returns user only',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  async registerCreator(
    @Body() dto: RegisterCreatorDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.registerCreator(
      dto,
      this.registerMeta(req),
    );
    return this.completeRegister(result, res);
  }

  @Post('register/brand')
  @ApiOperation({
    summary: 'Register as brand (user + brand profile in one step)',
  })
  @ApiBody({ type: RegisterBrandDto })
  @ApiResponse({
    status: 201,
    description:
      'Registered; tokens set in HttpOnly cookies; body returns user only',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  async registerBrand(
    @Body() dto: RegisterBrandDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.registerBrand(
      dto,
      this.registerMeta(req),
    );
    return this.completeRegister(result, res);
  }

  @Post('register/agency')
  @ApiOperation({
    summary: 'Register as agency (user + agency profile in one step)',
  })
  @ApiBody({ type: RegisterAgencyDto })
  @ApiResponse({
    status: 201,
    description:
      'Registered; tokens set in HttpOnly cookies; body returns user only',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists',
  })
  async registerAgency(
    @Body() dto: RegisterAgencyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.registerAgency(
      dto,
      this.registerMeta(req),
    );
    return this.completeRegister(result, res);
  }

  @Post('register')
  @ApiOperation({
    summary:
      'Legacy register (email, password, optional name). For creator/brand/agency signup use POST /auth/register/creator, /register/brand, or /register/agency.',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: PublicSignupRole,
    description:
      'Optional alias for role-based signup on this URL. Prefer POST /auth/register/creator (etc.) in Swagger so the request body matches the role.',
  })
  @ApiBody({ type: RegisterDto })
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
    @Query('role') roleQuery: string | undefined,
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = this.registerMeta(req);

    const role = parsePublicSignupRole(roleQuery);
    if (roleQuery?.trim() && !role) {
      throw new BadRequestException(
        'Invalid role. Use creator, brand, or agency.',
      );
    }

    let result: Awaited<ReturnType<AuthService['register']>>;

    if (
      body === null ||
      body === undefined ||
      typeof body !== 'object' ||
      Array.isArray(body)
    ) {
      throw new BadRequestException('Request body must be a JSON object');
    }

    if (!role) {
      const dto = plainToInstance(RegisterDto, body, {
        enableImplicitConversion: true,
      });
      const errors = await validate(dto);
      if (errors.length) {
        throw new BadRequestException(errors);
      }
      result = await this.authService.register(dto, meta);
    } else if (role === PublicSignupRole.CREATOR) {
      const dto = plainToInstance(RegisterCreatorDto, body, {
        enableImplicitConversion: true,
      });
      const errors = await validate(dto);
      if (errors.length) {
        throw new BadRequestException(errors);
      }
      result = await this.authService.registerCreator(dto, meta);
    } else if (role === PublicSignupRole.BRAND) {
      const dto = plainToInstance(RegisterBrandDto, body, {
        enableImplicitConversion: true,
      });
      const errors = await validate(dto);
      if (errors.length) {
        throw new BadRequestException(errors);
      }
      result = await this.authService.registerBrand(dto, meta);
    } else {
      const dto = plainToInstance(RegisterAgencyDto, body, {
        enableImplicitConversion: true,
      });
      const errors = await validate(dto);
      if (errors.length) {
        throw new BadRequestException(errors);
      }
      result = await this.authService.registerAgency(dto, meta);
    }

    return this.completeRegister(result, res);
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
  async registerAdmin(@Body() dto: RegisterDto) {
    const result = await this.authService.registerAdmin(dto);
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
      userAgent: req.headers?.['user-agent'],
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
    const storedState = readCookie(req, OAUTH_STATE_COOKIE);

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
        userAgent: req.headers?.['user-agent'],
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
    const refreshToken = readCookie(req, AUTH_COOKIE_NAMES.refreshToken);
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
    const refreshToken = readCookie(req, AUTH_COOKIE_NAMES.refreshToken);
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    clearAuthCookies(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'Current user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async me(
    @Req()
    req: Request & { user: { id: string; email: string; name: string | null } },
  ) {
    const user = await this.authService.getMeForClient(req.user.id);
    if (!user) {
      throw new UnauthorizedException();
    }
    return { user };
  }
}

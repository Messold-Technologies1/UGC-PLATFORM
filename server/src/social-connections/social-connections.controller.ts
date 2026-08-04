import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { SocialPlatform } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SocialConnectionsService } from './social-connections.service';
import { SocialMetricsQueueService } from './social-metrics-queue.service';
import {
  PublicInstagramInsightsDto,
  SocialConnectionsResponseDto,
  SocialConnectUrlResponseDto,
} from './dto/social-connection-response.dto';

const IG_STATE_COOKIE = 'ig_oauth_state';
const isProduction = process.env.NODE_ENV === 'production';

function stateCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/social',
    maxAge: 10 * 60 * 1000,
  };
}

function readCookie(req: Request, name: string): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[name];
  return typeof value === 'string' ? value : undefined;
}

@ApiTags('Social Connections')
@Controller('social')
export class SocialConnectionsController {
  constructor(
    private readonly service: SocialConnectionsService,
    private readonly queue: SocialMetricsQueueService,
    private readonly config: ConfigService,
  ) {}

  @Get('connections')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List the current creator's connected social accounts + metrics",
  })
  @ApiOkResponse({ type: SocialConnectionsResponseDto })
  async list(
    @Req() req: Request & { user: { id: string } },
  ): Promise<SocialConnectionsResponseDto> {
    const connections = await this.service.getConnectionsForUser(req.user.id);
    return { connections };
  }

  @Get('creators/:creatorProfileId/instagram/insights')
  @ApiOperation({
    summary: 'Public Instagram audience insights for a creator',
    description:
      'Aggregate followers/reach/profile-views + demographic breakdowns. No auth; returns { connected: false } when the creator has no active Instagram link.',
  })
  @ApiOkResponse({ type: PublicInstagramInsightsDto })
  async publicInstagramInsights(
    @Param('creatorProfileId', new ParseUUIDPipe()) creatorProfileId: string,
  ): Promise<PublicInstagramInsightsDto> {
    return this.service.getPublicInstagramInsights(creatorProfileId);
  }

  @Post('instagram/refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Re-sync the authenticated creator's Instagram now and return fresh insights",
  })
  @ApiOkResponse({ type: PublicInstagramInsightsDto })
  async refreshMyInstagram(
    @Req() req: Request & { user: { id: string } },
  ): Promise<PublicInstagramInsightsDto> {
    return this.service.refreshInstagramForUser(req.user.id);
  }

  @Post('creators/:creatorProfileId/instagram/refresh')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Admin: re-sync a creator's Instagram now and return fresh insights",
  })
  @ApiOkResponse({ type: PublicInstagramInsightsDto })
  async refreshCreatorInstagram(
    @Param('creatorProfileId', new ParseUUIDPipe()) creatorProfileId: string,
  ): Promise<PublicInstagramInsightsDto> {
    return this.service.refreshInstagramForCreator(creatorProfileId);
  }

  @Get('instagram/connect-url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the Instagram authorize URL and set the OAuth state cookie',
    description:
      'Call authenticated (so tokens refresh), then navigate the browser to the returned URL.',
  })
  @ApiOkResponse({ type: SocialConnectUrlResponseDto })
  async instagramConnectUrl(
    @Req() req: Request & { user: { id: string } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<SocialConnectUrlResponseDto> {
    const { url, nonce } = await this.service.buildInstagramConnectUrl(
      req.user.id,
    );
    res.cookie(IG_STATE_COOKIE, nonce, stateCookieOptions());
    return { url };
  }

  @Get('instagram/callback')
  @ApiOperation({ summary: 'Instagram OAuth callback' })
  @ApiResponse({
    status: 302,
    description: 'Redirect back to the profile settings page',
  })
  async instagramCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const returnTo = `${frontendUrl}/creator/settings/profile`;

    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const nonce = readCookie(req, IG_STATE_COOKIE);
    res.cookie(IG_STATE_COOKIE, '', { ...stateCookieOptions(), maxAge: 0 });

    if (!code || !state) {
      res.redirect(`${returnTo}?instagram=error`);
      return;
    }

    try {
      const { connectionId } = await this.service.handleInstagramCallback(
        code,
        state,
        nonce,
      );
      // Run the first metrics sync inline (off the request path) rather than
      // via the BullMQ worker, so audience metrics — reach + demographics —
      // populate right after connecting even when the queue worker is slow or
      // not consuming. syncConnection records its own failures and never throws;
      // the daily cron still handles periodic refreshes via the queue.
      void this.queue.processConnectionDirect(connectionId, 'connect');
      res.redirect(`${returnTo}?instagram=connected`);
    } catch {
      res.redirect(`${returnTo}?instagram=error`);
    }
  }

  @Delete(':platform')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect a social account (removes its data)' })
  @ApiResponse({ status: 200, description: 'Disconnected' })
  async disconnect(
    @Req() req: Request & { user: { id: string } },
    @Param('platform') platform: string,
  ): Promise<{ disconnected: true }> {
    const normalized = platform.toUpperCase();
    if (!Object.values(SocialPlatform).includes(normalized as SocialPlatform)) {
      throw new BadRequestException('Unknown platform');
    }
    await this.service.disconnect(req.user.id, normalized as SocialPlatform);
    return { disconnected: true };
  }
}

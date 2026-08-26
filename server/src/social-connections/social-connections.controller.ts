import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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
import {
  InstagramAccountAlreadyLinkedError,
  SocialConnectionsService,
} from './social-connections.service';
import { SocialMetricsQueueService } from './social-metrics-queue.service';
import {
  PublicInstagramInsightsDto,
  SocialConnectionsResponseDto,
  SocialConnectUrlResponseDto,
} from './dto/social-connection-response.dto';
import {
  InstagramMediaPageDto,
  InstagramMediaStatusDto,
  ListInstagramMediaQueryDto,
} from './dto/instagram-media-response.dto';
import { InstagramMediaService } from './instagram-media.service';
import {
  IG_SYNC_PRIORITY,
  InstagramMediaQueueService,
} from './instagram-media-queue.service';

const IG_STATE_COOKIE = 'ig_oauth_state';
/** Where to send the creator after the callback (see sanitizeReturnPath). */
const IG_RETURN_COOKIE = 'ig_oauth_return';

/**
 * Accept only a root-relative path on our own site.
 *
 * Anything with a scheme, a protocol-relative `//host` prefix, or a backslash
 * (which some browsers normalise to `/`) is discarded, so neither a caller nor
 * a tampered cookie can redirect the creator off-site after connecting.
 */
export function sanitizeReturnPath(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//')) return null;
  if (value.includes('\\')) return null;
  if (/^\/+\s*[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  return value;
}
const isProduction = process.env.NODE_ENV === 'production';
// Optional shared parent domain (e.g. ".gocollab.io") so the CSRF cookie set on
// the app origin still rides along to the api origin when they are different
// subdomains. Leave unset for same-origin/local dev (host-only cookie). The
// callback trusts the signed state regardless, so this only restores the
// best-effort cookie check in normal (non-in-app) browsers.
const IG_STATE_COOKIE_DOMAIN =
  process.env.IG_OAUTH_STATE_COOKIE_DOMAIN?.trim() || undefined;

function stateCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/social',
    maxAge: 10 * 60 * 1000,
    ...(IG_STATE_COOKIE_DOMAIN ? { domain: IG_STATE_COOKIE_DOMAIN } : {}),
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
  private readonly logger = new Logger(SocialConnectionsController.name);

  constructor(
    private readonly service: SocialConnectionsService,
    private readonly queue: SocialMetricsQueueService,
    private readonly config: ConfigService,
    private readonly media: InstagramMediaService,
    private readonly mediaQueue: InstagramMediaQueueService,
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

  @Get('instagram/media')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary: "One page of the creator's cached reels",
    description:
      'Served entirely from our cache — this never calls the Graph API. A cold ' +
      'or stale cache responds with status=syncing, returns whatever is cached, ' +
      'and enqueues a refresh in the background.',
  })
  @ApiOkResponse({ type: InstagramMediaPageDto })
  async listInstagramMedia(
    @Req() req: Request & { user: { id: string } },
    @Query() query: ListInstagramMediaQueryDto,
  ): Promise<InstagramMediaPageDto> {
    const page = await this.media.getGalleryPage(req.user.id, {
      cursor: query.cursor,
      limit: query.limit,
    });

    // Only the first page triggers a refresh: a creator paging through a stale
    // cache should not enqueue on every scroll.
    if (page.status === 'syncing' && !query.cursor) {
      const connection = await this.media.findConnectionForUser(req.user.id);
      if (connection) {
        void this.mediaQueue.enqueue(connection.id, {
          priority: IG_SYNC_PRIORITY.interactive,
        });
      }
    }
    return page as InstagramMediaPageDto;
  }

  @Get('instagram/media/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Sync progress for the reel cache',
    description: 'Polling target while the gallery shows its loading state.',
  })
  @ApiOkResponse({ type: InstagramMediaStatusDto })
  async instagramMediaStatus(
    @Req() req: Request & { user: { id: string } },
  ): Promise<InstagramMediaStatusDto> {
    return this.media.getSyncStatus(req.user.id);
  }

  @Post('instagram/media/refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 3, ttl: 60 * 60_000 } })
  @ApiOperation({
    summary: 'Force a reel-cache refresh from the first page',
    description:
      'Backs the Refresh button. Rate-limited to 3/hour by the HTTP throttle ' +
      'and again by a stored lastRefreshAt, so the guard survives a throttle ' +
      'bypass and can report how long is left.',
  })
  @ApiOkResponse({ type: InstagramMediaStatusDto })
  async refreshInstagramMedia(
    @Req() req: Request & { user: { id: string } },
  ): Promise<InstagramMediaStatusDto> {
    const connection = await this.media.findConnectionForUser(req.user.id);
    if (!connection) {
      throw new NotFoundException('No Instagram account connected');
    }
    await this.media.assertRefreshAllowed(connection.id);
    await this.media.markRefreshRequested(connection.id);
    void this.mediaQueue.enqueue(connection.id, {
      priority: IG_SYNC_PRIORITY.interactive,
      fromStart: true,
    });
    return this.media.getSyncStatus(req.user.id);
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
    summary:
      "Admin: re-sync a creator's Instagram now and return fresh insights",
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
    @Query('returnTo') returnTo?: string,
  ): Promise<SocialConnectUrlResponseDto> {
    const { url, nonce } = await this.service.buildInstagramConnectUrl(
      req.user.id,
    );
    res.cookie(IG_STATE_COOKIE, nonce, stateCookieOptions());
    // Remembered in a cookie rather than round-tripped through Meta: `state`
    // already carries the signed nonce, and Meta echoes it verbatim, so
    // appending caller data there would put it on a third party's URL.
    if (returnTo) {
      res.cookie(IG_RETURN_COOKIE, sanitizeReturnPath(returnTo), {
        ...stateCookieOptions(),
        path: '/api/social',
      });
    }
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
    // Where to land afterwards. Only a same-site path is honoured, so a
    // tampered cookie cannot turn the callback into an open redirect.
    const requestedPath = sanitizeReturnPath(readCookie(req, IG_RETURN_COOKIE));
    const returnTo = `${frontendUrl}${requestedPath ?? '/creator/settings/profile'}`;
    res.cookie(IG_RETURN_COOKIE, '', {
      ...stateCookieOptions(),
      path: '/api/social',
      maxAge: 0,
    });

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
      // Kick off the first metrics sync in the background.
      void this.queue.enqueue(connectionId);
      // Warm the reel cache too, at a lower priority than anything
      // interactive, so the gallery is usually ready before they open it.
      void this.mediaQueue.enqueue(connectionId, {
        priority: IG_SYNC_PRIORITY.prewarm,
        fromStart: true,
      });
      res.redirect(`${returnTo}?instagram=connected`);
    } catch (err) {
      this.logger.warn(
        `instagram callback failed: ${(err as Error)?.message}`,
        (err as Error)?.stack,
      );
      const code =
        err instanceof InstagramAccountAlreadyLinkedError
          ? 'already_linked'
          : 'error';
      res.redirect(`${returnTo}?instagram=${code}`);
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

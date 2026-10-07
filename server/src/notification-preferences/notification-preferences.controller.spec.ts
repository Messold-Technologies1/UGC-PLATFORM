import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';

/**
 * Routing and validation for the settings card's only endpoint.
 *
 * The client hardcodes this path and sends one toggle at a time, so the things
 * worth pinning are the URL itself, the global prefix, and that the body pipe
 * rejects anything that is not a boolean before it reaches a Prisma update.
 * Guarded by the real JwtAuthGuard shape but with the token check stubbed —
 * authentication has its own cover.
 */

const prefs = {
  profileType: 'agency' as const,
  emailNotificationsEnabled: true,
  whatsappNotificationsEnabled: false,
};

describe('NotificationPreferencesController (routing)', () => {
  let app: INestApplication<App>;
  const service = {
    getForUser: jest.fn().mockResolvedValue(prefs),
    updateForUser: jest.fn().mockResolvedValue(prefs),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationPreferencesController],
      providers: [
        { provide: NotificationPreferencesService, useValue: service },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: {
          switchToHttp: () => { getRequest: () => { user?: unknown } };
        }) => {
          ctx.switchToHttp().getRequest().user = { id: 'user-1' };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    // Same pipe and prefix main.ts installs, so the path and the rejected
    // bodies here are the ones the browser actually sees.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it('serves the path the client calls', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/notification-preferences/me')
      .expect(200);

    expect(res.body).toEqual(prefs);
    expect(service.getForUser).toHaveBeenCalledWith('user-1');
  });

  it('saves a single toggle', async () => {
    await request(app.getHttpServer())
      .patch('/api/notification-preferences/me')
      .send({ whatsappNotificationsEnabled: false })
      .expect(200);

    expect(service.updateForUser).toHaveBeenCalledWith('user-1', {
      whatsappNotificationsEnabled: false,
    });
  });

  it('rejects a non-boolean toggle', async () => {
    await request(app.getHttpServer())
      .patch('/api/notification-preferences/me')
      .send({ emailNotificationsEnabled: 'yes' })
      .expect(400);

    expect(service.updateForUser).not.toHaveBeenCalled();
  });

  it('rejects unknown fields rather than silently dropping them', async () => {
    // forbidNonWhitelisted: a typo'd key must fail loudly, not look saved.
    await request(app.getHttpServer())
      .patch('/api/notification-preferences/me')
      .send({ emailNotifications: false })
      .expect(400);

    expect(service.updateForUser).not.toHaveBeenCalled();
  });
});

import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AuthGuardsModule } from '../auth/auth-guards.module';
import { MetaCapiModule } from '../meta-capi/meta-capi.module';
import { StorageModule } from '../storage/storage.module';
import { BrandAccessModule } from '../brand-access/brand-access.module';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { NotificationsModule } from './notifications.module';
import { NotificationEventsService } from './dispatch/notification-events.service';
import { NotificationStepService } from './dispatch/notification-step.service';
import { NotificationLogService } from './log/notification-log.service';
import { NotificationQueueService } from './queues/notification-queue.service';
import { NotificationRegistrySyncService } from './catalog/registry-sync.service';
import { NotificationTemplateRenderer } from './rendering/notification-template-renderer.service';

/**
 * Resolves the whole provider graph.
 *
 * Worth its own test because a missing `exports:` entry is invisible until the
 * app boots — SesMailTransport and WhatsAppCloudTransport were both unexported
 * when this module was first written, and nothing else would have caught it.
 */
describe('NotificationsModule wiring', () => {
  const prismaStub = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    notificationEvent: {
      upsert: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };

  async function build() {
    return Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          // No REDIS_URL: the queue service must degrade to a warning rather
          // than failing to construct.
          // Enough config for the graph to construct. The point of this test
          // is DI resolution, not behaviour, so placeholder values are fine.
          load: [
            () => ({
              FRONTEND_URL: 'https://app.gocollab.io',
              AWS_REGION: 'ap-south-1',
              AWS_S3_ACCESS_KEY_ID: 'test',
              AWS_S3_SECRET_ACCESS_KEY: 'test',
              S3_BUCKET_NAME: 'test-bucket',
              CDN_BASE_URL: 'https://cdn.test',
              JWT_ACCESS_SECRET: 'test-secret',
              JWT_REFRESH_SECRET: 'test-refresh-secret',
            }),
          ],
        }),
        PrismaModule,
        BrandAccessModule,
        // Globals the guard chain reaches transitively. In the app these are
        // registered by AppModule; an isolated graph has to name them.
        MetaCapiModule,
        StorageModule,
        AuthGuardsModule,
        MailModule,
        WhatsAppModule,
        NotificationsModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();
  }

  it('resolves every notification provider', async () => {
    const moduleRef = await build();

    for (const provider of [
      NotificationEventsService,
      NotificationStepService,
      NotificationLogService,
      NotificationQueueService,
      NotificationRegistrySyncService,
      NotificationTemplateRenderer,
    ]) {
      expect(moduleRef.get(provider)).toBeInstanceOf(provider);
    }

    await moduleRef.close();
  });

  it('exports emit() and the log to the rest of the app', async () => {
    const moduleRef = await build();

    // These two are the module's entire public surface: everything else stays
    // internal so no caller learns that email or WhatsApp exist.
    expect(
      moduleRef.get(NotificationEventsService, { strict: false }),
    ).toBeDefined();
    expect(
      moduleRef.get(NotificationLogService, { strict: false }),
    ).toBeDefined();

    await moduleRef.close();
  });
});

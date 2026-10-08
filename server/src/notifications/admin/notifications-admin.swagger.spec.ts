import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NotificationsAdminController } from './notifications-admin.controller';
import { NotificationsAdminService } from './notifications-admin.service';

/**
 * Swagger has to be able to describe this controller.
 *
 * An enum-typed parameter declared as a bare `@Query('channel')` emits the
 * runtime enum OBJECT as its design:type. Swagger reads that as an object
 * literal, walks it, and throws "circular dependency ... property key: EMAIL"
 * — which kills document generation, and with it boot, since Swagger runs
 * whenever NODE_ENV is not production. Filters belong in a DTO, where the enum
 * is declared with @ApiPropertyOptional({ enum }) instead.
 *
 * Asserted by generating the document rather than by inspecting the decorators,
 * so it covers any future parameter that reintroduces the shape.
 */
describe('NotificationsAdminController (swagger)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const allow = { canActivate: () => true };
    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationsAdminController],
      providers: [{ provide: NotificationsAdminService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allow)
      .overrideGuard(AdminGuard)
      .useValue(allow)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  function build() {
    return SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('t').setVersion('1').build(),
    );
  }

  it('generates a document without tripping the circular-dependency guard', () => {
    expect(() => build()).not.toThrow();
  });

  it('describes the delivery-log filters, with the enums as enums', () => {
    const params = (build().paths['/admin/notifications/logs'].get
      ?.parameters ?? []) as Array<{
      name: string;
      schema?: { enum?: string[]; type?: string };
    }>;
    const byName = Object.fromEntries(params.map((p) => [p.name, p.schema]));

    expect(byName.channel?.enum).toEqual(['EMAIL', 'WHATSAPP']);
    expect(byName.status?.enum).toContain('DELIVERED');
    // A plain string filter must stay a string, not become an enum.
    expect(byName.eventKey?.type).toBe('string');
  });
});

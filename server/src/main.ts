import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import type { IncomingMessage } from 'node:http';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bodyParser: false,
  });

  const captureRawBody = (
    req: IncomingMessage & { rawBody?: Buffer },
    _res: unknown,
    buf: Buffer,
  ) => {
    req.rawBody = buf;
  };

  // SNS posts JSON as text/plain — parse this route before the global JSON parser.
  app.use(
    '/api/webhooks/ses',
    express.text({
      type: () => true,
      limit: '1mb',
      verify: captureRawBody,
    }),
  );

  app.use(
    express.json({
      limit: '2mb',
      verify: captureRawBody,
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  const configService = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());
  const configuredOrigin = configService.get<string>('CORS_ORIGIN');
  const origin =
    !configuredOrigin || configuredOrigin.trim() === '*'
      ? true
      : configuredOrigin.split(',').map((s) => s.trim()).filter(Boolean);
  app.enableCors({ origin, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const swaggerEnabled =
    configService.get<string>('SWAGGER_ENABLED') === 'true' ||
    configService.get<string>('NODE_ENV') !== 'production';

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('UGC Platform API')
      .setDescription('API documentation for UGC Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

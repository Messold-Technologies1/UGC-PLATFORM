import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppModule } from '../src/app.module';

type RequestWithRawBody = IncomingMessage & { rawBody?: Buffer };

let cachedServer: express.Express | null = null;

async function getServer() {
  if (cachedServer) return cachedServer;

  const server = express();

  const captureRawBody = (
    req: IncomingMessage,
    _res: ServerResponse,
    buf: Buffer,
    _encoding: string,
  ): void => {
    (req as RequestWithRawBody).rawBody = buf;
  };

  const isWebhookRequest = (req: IncomingMessage) => {
    const path = req.url ?? '';
    return path.includes('/webhooks');
  };

  // Webhooks: capture raw body for all content types (SNS uses text/plain JSON).
  server.use(
    express.json({
      verify: captureRawBody,
      type: (req) =>
        isWebhookRequest(req) ||
        String(req.headers['content-type'] ?? '').includes('application/json'),
    }),
  );
  server.use(
    express.text({
      verify: captureRawBody,
      type: (req) =>
        isWebhookRequest(req) &&
        String(req.headers['content-type'] ?? '').includes('text/plain'),
    }),
  );
  server.use(
    express.urlencoded({
      extended: true,
      verify: captureRawBody,
    }),
  );

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    rawBody: true,
  });

  const configService = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Match local routing: all controllers live under /api/*
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

  await app.init();

  cachedServer = server;
  return server;
}

export default async function handler(req: any, res: any) {
  const server = await getServer();
  return server(req, res);
}

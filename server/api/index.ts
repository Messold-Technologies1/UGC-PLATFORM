import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { AppModule } from '../src/app.module';

let cachedServer: express.Express | null = null;

async function getServer() {
  if (cachedServer) return cachedServer;

  const server = express();
  // Ensure webhooks can verify Razorpay signatures using the raw request body.
  server.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  server.use(
    express.urlencoded({
      extended: true,
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
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

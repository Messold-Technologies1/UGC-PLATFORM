import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Module } from '@nestjs/common';
import { IsArray, IsOptional, IsString } from 'class-validator';
import request from 'supertest';
import type { Server } from 'node:http';

import { singleQueryString } from './query-value.util';

/**
 * The query parser is an app-level Express setting, so the only honest test
 * of it is over HTTP. This boots a real Nest + Express app configured the way
 * main.ts configures it, and drives it with the two array formats a client
 * might send.
 *
 * Worth an HTTP test rather than a unit one because the failure it guards
 * against was invisible everywhere else: the DTO was correct, the service was
 * correct, and the request still 400'd on the way in.
 */
class TagsQueryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tag?: string[];
}

@Controller('probe')
class ProbeController {
  @Get('tags')
  tags(@Query() query: TagsQueryDto) {
    return { tag: query.tag ?? null };
  }

  @Get('role')
  role(@Query('role') role: unknown) {
    // Mirrors the OAuth handler: a bare string param that calls a string
    // method on whatever arrives.
    return { role: singleQueryString(role)?.toUpperCase() ?? null };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe('query parser (as configured in main.ts)', () => {
  let app: NestExpressApplication;
  let server: Server;

  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(ProbeModule, {
      logger: false,
    });
    // The two lines under test, copied from main.ts.
    app.set('query parser', 'extended');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it("accepts axios's bracket array format", async () => {
    // Without `extended` this is a property named `tag[]` and the whole
    // request is rejected: 400 "property tag[] should not exist".
    const res = await request(server).get('/probe/tags?tag[]=a&tag[]=b');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tag: ['a', 'b'] });
  });

  it('accepts repeated keys, which is what the client sends', async () => {
    const res = await request(server).get('/probe/tags?tag=a&tag=b');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tag: ['a', 'b'] });
  });

  it('still rejects an unknown property', async () => {
    const res = await request(server).get('/probe/tags?nope=1');
    expect(res.status).toBe(400);
  });

  it('does not 500 when a bare string param is sent as an object', async () => {
    // The cost of `extended`: a caller controls the shape, not just the text.
    // `role?.toUpperCase()` on an object would throw. `singleQueryString`
    // drops it instead.
    const res = await request(server).get('/probe/role?role[x]=1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ role: null });
  });

  it('still reads a bare string param normally', async () => {
    const res = await request(server).get('/probe/role?role=brand');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ role: 'BRAND' });
  });
});

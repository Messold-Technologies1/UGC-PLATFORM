import { ValidationPipe } from '@nestjs/common';
import { parse as parseQuery } from 'node:querystring';

import {
  AdminCreatorListSegment,
  AdminCreatorSegmentCountsQueryDto,
  AdminCreatorsListQueryDto,
} from './admin-creator-list.dto';

/**
 * The admin list and its tab counts take the browse page's filter set by
 * inheriting `CreatorFilterQueryDto`. The global pipe runs with
 * `whitelist` + `forbidNonWhitelisted`, so a field it cannot see validation
 * metadata for is not ignored — the whole request is rejected with
 * "property <name> should not exist".
 *
 * Reproduces exactly what the pipe does to a real query string.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const asQuery = (metatype: new () => object) => ({
  type: 'query' as const,
  metatype,
});

describe('admin creator list query DTOs', () => {
  it('accepts an inherited array filter on the list query', async () => {
    const value = await pipe.transform(
      { segment: AdminCreatorListSegment.SELF_COMPLETED, creatorType: ['mom'] },
      asQuery(AdminCreatorsListQueryDto),
    );
    expect(value).toMatchObject({ creatorType: ['mom'] });
  });

  it('accepts an inherited array filter on the counts query', async () => {
    const value = await pipe.transform(
      { creatorType: ['mom'] },
      asQuery(AdminCreatorSegmentCountsQueryDto),
    );
    expect(value).toMatchObject({ creatorType: ['mom'] });
  });

  it('accepts every inherited filter at once', async () => {
    const value = await pipe.transform(
      {
        segment: AdminCreatorListSegment.LISTED,
        city: 'Mumbai',
        gender: 'FEMALE',
        ageGroup: 'AGE_25_34',
        contentCategory: ['beauty'],
        creatorType: ['ugc'],
        appearance: ['tall'],
        occupation: ['student'],
        language: ['hindi'],
        restrictions: ['Alcohol'],
        minPrice: 500,
        maxPrice: 5000,
        maxDeliveryDays: 7,
        minFollowers: 1000,
        maxFollowers: 10000,
        onLocationAvailable: true,
      },
      asQuery(AdminCreatorsListQueryDto),
    );
    expect(value).toMatchObject({
      city: 'Mumbai',
      contentCategory: ['beauty'],
      minFollowers: 1000,
      onLocationAvailable: true,
    });
  });

  it('still rejects a genuinely unknown property', async () => {
    await expect(
      pipe.transform(
        { segment: AdminCreatorListSegment.LISTED, nonsense: 'x' },
        asQuery(AdminCreatorsListQueryDto),
      ),
    ).rejects.toThrow();
  });
});

describe('admin creator list query, as it arrives off the wire', () => {
  // The DTO being right is not enough — it never saw the bad request. This
  // app runs Express 5, whose `query parser` defaults to `simple` (Node's
  // querystring) and does not understand bracket notation, and main.ts does
  // not change it. So what the client puts on the wire decides whether an
  // array filter survives, and `forbidNonWhitelisted` turns a mis-serialized
  // one into a 400 for the whole request rather than an ignored param.

  it('accepts an array sent as repeated keys', async () => {
    const value = await pipe.transform(
      parseQuery('segment=listed&creatorType=mom&creatorType=ugc'),
      asQuery(AdminCreatorsListQueryDto),
    );
    expect(value).toMatchObject({ creatorType: ['mom', 'ugc'] });
  });

  it('accepts a single repeated-key value as an array', async () => {
    const value = await pipe.transform(
      parseQuery('segment=listed&creatorType=mom'),
      asQuery(AdminCreatorsListQueryDto),
    );
    expect(value).toMatchObject({ creatorType: ['mom'] });
  });

  it("rejects axios's default bracket format, which is what broke in prod", async () => {
    // `creatorType[]=mom` parses to a property literally named
    // `creatorType[]`, which is not on the DTO:
    //   400 {"message":["property creatorType[] should not exist"]}
    // The client serializes with repeated keys to avoid exactly this.
    expect(parseQuery('creatorType[]=mom')).toEqual({ 'creatorType[]': 'mom' });
    await expect(
      pipe.transform(
        parseQuery('segment=listed&creatorType[]=mom'),
        asQuery(AdminCreatorsListQueryDto),
      ),
    ).rejects.toThrow();
  });

  it('accepts the counts query the same way', async () => {
    const value = await pipe.transform(
      parseQuery('search=jane&contentCategory=beauty&contentCategory=tech'),
      asQuery(AdminCreatorSegmentCountsQueryDto),
    );
    expect(value).toMatchObject({
      search: 'jane',
      contentCategory: ['beauty', 'tech'],
    });
  });
});

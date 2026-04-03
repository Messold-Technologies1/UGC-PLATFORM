import { PortfolioVisibilityStatus } from '@prisma/client';
import {
  buildCreatorListRelationsInclude,
  buildListCreatorsWhere,
  buildPortfolioVideoMatchWhere,
} from './creator-list-filters.util';
import type { ListCreatorsQueryDto } from './dto/list-creators-query.dto';

describe('creator-list-filters.util', () => {
  describe('buildPortfolioVideoMatchWhere', () => {
    it('returns undefined when no portfolio filters', () => {
      expect(buildPortfolioVideoMatchWhere({})).toBeUndefined();
    });

    it('builds industry-only match', () => {
      const q: ListCreatorsQueryDto = { industry: 'Fashion' };
      expect(buildPortfolioVideoMatchWhere(q)).toEqual({
        AND: [
          { visibilityStatus: PortfolioVisibilityStatus.PUBLIC },
          { industryLabel: { equals: 'Fashion', mode: 'insensitive' } },
        ],
      });
    });

    it('builds tag-only match', () => {
      const q: ListCreatorsQueryDto = { portfolioTag: 'skincare' };
      expect(buildPortfolioVideoMatchWhere(q)).toEqual({
        AND: [
          { visibilityStatus: PortfolioVisibilityStatus.PUBLIC },
          {
            tags: {
              some: { tag: { equals: 'skincare', mode: 'insensitive' } },
            },
          },
        ],
      });
    });

    it('requires same video for industry and tag', () => {
      const q: ListCreatorsQueryDto = {
        industry: 'fashion',
        portfolioTag: 'summer',
      };
      expect(buildPortfolioVideoMatchWhere(q)).toEqual({
        AND: [
          { visibilityStatus: PortfolioVisibilityStatus.PUBLIC },
          { industryLabel: { equals: 'fashion', mode: 'insensitive' } },
          {
            tags: {
              some: { tag: { equals: 'summer', mode: 'insensitive' } },
            },
          },
        ],
      });
    });
  });

  describe('buildListCreatorsWhere', () => {
    it('returns empty object with no filters', () => {
      expect(buildListCreatorsWhere({})).toEqual({});
    });

    it('ANDs city and industry', () => {
      const q: ListCreatorsQueryDto = {
        city: 'Kolkata',
        industry: 'fashion',
      };
      expect(buildListCreatorsWhere(q)).toEqual({
        AND: [
          { city: { contains: 'Kolkata', mode: 'insensitive' } },
          {
            portfolioVideos: {
              some: {
                AND: [
                  { visibilityStatus: PortfolioVisibilityStatus.PUBLIC },
                  {
                    industryLabel: {
                      equals: 'fashion',
                      mode: 'insensitive',
                    },
                  },
                ],
              },
            },
          },
        ],
      });
    });

    it('uses OR within personaTags', () => {
      const q: ListCreatorsQueryDto = {
        personaTags: ['a', 'b'],
      };
      expect(buildListCreatorsWhere(q)).toEqual({
        personaTags: {
          some: {
            tag: { in: ['a', 'b'], mode: 'insensitive' },
          },
        },
      });
    });
  });

  describe('buildCreatorListRelationsInclude', () => {
    it('uses PUBLIC-only preview when no portfolio filters', () => {
      const inc = buildCreatorListRelationsInclude({});
      expect(inc.portfolioVideos).toMatchObject({
        where: { visibilityStatus: PortfolioVisibilityStatus.PUBLIC },
        take: 1,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('narrows preview when industry filter set', () => {
      const inc = buildCreatorListRelationsInclude({ industry: 'beauty' });
      expect(inc.portfolioVideos).toMatchObject({
        where: {
          AND: [
            { visibilityStatus: PortfolioVisibilityStatus.PUBLIC },
            {
              industryLabel: { equals: 'beauty', mode: 'insensitive' },
            },
          ],
        },
        take: 1,
      });
    });
  });
});

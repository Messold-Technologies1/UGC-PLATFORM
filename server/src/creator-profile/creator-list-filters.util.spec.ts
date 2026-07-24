import {
  ApprovalStatus,
  CreatorFacetDimension,
  PortfolioVisibilityStatus,
} from '@prisma/client';
import {
  buildAdminCreatorApprovalSearchWhere,
  buildAdminCreatorsListWhere,
  buildCreatorListRelationsInclude,
  buildCreatorListSearchWhere,
  buildListCreatorsWhere,
  buildPortfolioVideoMatchWhere,
} from './creator-list-filters.util';
import { AdminCreatorListSegment } from './dto/admin-creator-list.dto';
import type { ListCreatorsQueryDto } from './dto/list-creators-query.dto';

describe('creator-list-filters.util', () => {
  describe('buildPortfolioVideoMatchWhere', () => {
    it('returns undefined when no portfolio filters', () => {
      expect(buildPortfolioVideoMatchWhere({})).toBeUndefined();
    });

    it('builds industry-only match with contains', () => {
      const q: ListCreatorsQueryDto = { industry: 'Fashion' };
      expect(buildPortfolioVideoMatchWhere(q)).toEqual({
        AND: [
          { visibilityStatus: PortfolioVisibilityStatus.PUBLIC },
          { industryLabel: { contains: 'Fashion', mode: 'insensitive' } },
        ],
      });
    });

    it('builds tag-only match with contains', () => {
      const q: ListCreatorsQueryDto = { portfolioTag: 'skincare' };
      expect(buildPortfolioVideoMatchWhere(q)).toEqual({
        AND: [
          { visibilityStatus: PortfolioVisibilityStatus.PUBLIC },
          {
            tags: {
              some: { tag: { contains: 'skincare', mode: 'insensitive' } },
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
          { industryLabel: { contains: 'fashion', mode: 'insensitive' } },
          {
            tags: {
              some: { tag: { contains: 'summer', mode: 'insensitive' } },
            },
          },
        ],
      });
    });
  });

  describe('buildListCreatorsWhere', () => {
    it('requires listed creators when no other filters', () => {
      expect(buildListCreatorsWhere({})).toEqual({
        isListed: true,
      });
    });

    it('omits listing filter when requireApproved is false', () => {
      expect(buildListCreatorsWhere({}, { requireApproved: false })).toEqual(
        {},
      );
    });

    it('filters by content category facet slugs', () => {
      const q: ListCreatorsQueryDto = {
        contentCategory: ['fashion', 'beauty_skincare'],
      };
      expect(buildListCreatorsWhere(q)).toEqual({
        AND: [
          { isListed: true },
          {
            facetSelections: {
              some: {
                option: {
                  dimension: CreatorFacetDimension.CONTENT_CATEGORY,
                  slug: { in: ['fashion', 'beauty_skincare'] },
                },
              },
            },
          },
        ],
      });
    });

    it('ANDs city and industry', () => {
      const q: ListCreatorsQueryDto = {
        city: 'Kolkata',
        industry: 'fashion',
      };
      expect(buildListCreatorsWhere(q)).toEqual({
        AND: [
          { isListed: true },
          { city: { contains: 'Kolkata', mode: 'insensitive' } },
          {
            portfolioVideos: {
              some: {
                AND: [
                  { visibilityStatus: PortfolioVisibilityStatus.PUBLIC },
                  {
                    industryLabel: {
                      contains: 'fashion',
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



    it('filters by package price range when min and max set', () => {
      const q: ListCreatorsQueryDto = { minPrice: 100, maxPrice: 500 };
      expect(buildListCreatorsWhere(q)).toEqual({
        AND: [
          { isListed: true },
          {
            packages: {
              some: {
                priceAmount: { gte: 100, lte: 500 },
              },
            },
          },
        ],
      });
    });

    it('filters by min price only', () => {
      const q: ListCreatorsQueryDto = { minPrice: 50 };
      expect(buildListCreatorsWhere(q)).toEqual({
        AND: [
          { isListed: true },
          {
            packages: {
              some: {
                priceAmount: { gte: 50 },
              },
            },
          },
        ],
      });
    });

    it('filters by max price only', () => {
      const q: ListCreatorsQueryDto = { maxPrice: 1000 };
      expect(buildListCreatorsWhere(q)).toEqual({
        AND: [
          { isListed: true },
          {
            packages: {
              some: {
                priceAmount: { lte: 1000 },
              },
            },
          },
        ],
      });
    });

    it('filters by max delivery days across packages or faster-delivery add-ons', () => {
      const q: ListCreatorsQueryDto = { maxDeliveryDays: 2 };
      expect(buildListCreatorsWhere(q)).toEqual({
        AND: [
          { isListed: true },
          {
            OR: [
              {
                packages: {
                  some: {
                    deliveryDays: { lte: 2 },
                  },
                },
              },
              {
                addOns: {
                  some: {
                    deliveryDays: { lte: 2, not: null },
                  },
                },
              },
            ],
          },
        ],
      });
    });

    it('searches by location or bio, never by creator name', () => {
      expect(buildListCreatorsWhere({ search: 'mumbai' })).toEqual({
        AND: [
          { isListed: true },
          {
            OR: [
              { city: { contains: 'mumbai', mode: 'insensitive' } },
              { stateName: { contains: 'mumbai', mode: 'insensitive' } },
              { countryName: { contains: 'mumbai', mode: 'insensitive' } },
              { bio: { contains: 'mumbai', mode: 'insensitive' } },
            ],
          },
        ],
      });
    });
  });

  describe('buildCreatorListSearchWhere', () => {
    it('returns undefined for blank search', () => {
      expect(buildCreatorListSearchWhere('   ')).toBeUndefined();
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
      expect(inc.packages).toEqual({
        select: {
          name: true,
          priceAmount: true,
          deliveryDays: true,
          deliverables: true,
        },
      });
    });

    it('narrows preview when industry filter set', () => {
      const inc = buildCreatorListRelationsInclude({ industry: 'beauty' });
      expect(inc.portfolioVideos).toMatchObject({
        where: {
          AND: [
            { visibilityStatus: PortfolioVisibilityStatus.PUBLIC },
            {
              industryLabel: { contains: 'beauty', mode: 'insensitive' },
            },
          ],
        },
        take: 1,
      });
    });
  });

  describe('buildAdminCreatorApprovalSearchWhere', () => {
    it('returns undefined for blank search', () => {
      expect(buildAdminCreatorApprovalSearchWhere('   ')).toBeUndefined();
    });

    it('matches display name only', () => {
      expect(buildAdminCreatorApprovalSearchWhere('jane')).toEqual({
        displayName: { contains: 'jane', mode: 'insensitive' },
      });
    });
  });

  describe('buildAdminCreatorsListWhere', () => {
    it('filters pending creators', () => {
      expect(
        buildAdminCreatorsListWhere(
          AdminCreatorListSegment.PENDING,
          undefined,
          'approval_first',
        ),
      ).toEqual({
        creatorApproval: { status: ApprovalStatus.PENDING },
      });
    });

    it('filters pending submitted profiles in profile_first mode', () => {
      expect(
        buildAdminCreatorsListWhere(
          AdminCreatorListSegment.PENDING,
          undefined,
          'profile_first',
        ),
      ).toEqual({
        creatorApproval: { status: ApprovalStatus.PENDING },
        completeProfile: true,
      });
    });

    it('filters approved creators', () => {
      expect(
        buildAdminCreatorsListWhere(
          AdminCreatorListSegment.APPROVED,
          undefined,
          'approval_first',
        ),
      ).toEqual({
        creatorApproval: { status: ApprovalStatus.APPROVED },
      });
    });

    it('filters rejected creators for non_approved segment', () => {
      expect(
        buildAdminCreatorsListWhere(
          AdminCreatorListSegment.NON_APPROVED,
          undefined,
          'approval_first',
        ),
      ).toEqual({
        creatorApproval: { status: ApprovalStatus.REJECTED },
      });
    });

    it('filters incomplete profiles for approved creators only in approval_first mode', () => {
      expect(
        buildAdminCreatorsListWhere(
          AdminCreatorListSegment.INCOMPLETE,
          undefined,
          'approval_first',
        ),
      ).toEqual({
        completeProfile: false,
        creatorApproval: { status: ApprovalStatus.APPROVED },
      });
    });

    it('filters incomplete pending or approved profiles in profile_first mode', () => {
      expect(
        buildAdminCreatorsListWhere(
          AdminCreatorListSegment.INCOMPLETE,
          undefined,
          'profile_first',
        ),
      ).toEqual({
        completeProfile: false,
        creatorApproval: {
          status: {
            in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED],
          },
        },
      });
    });

    it('filters shortlisted incomplete profiles', () => {
      expect(
        buildAdminCreatorsListWhere(
          AdminCreatorListSegment.SHORTLISTED,
          undefined,
          'profile_first',
        ),
      ).toEqual({
        completeProfile: false,
        creatorApproval: { status: ApprovalStatus.SHORTLISTED },
      });
    });

    it('puts all rejected creators in non_approved regardless of completeProfile', () => {
      expect(
        buildAdminCreatorsListWhere(
          AdminCreatorListSegment.NON_APPROVED,
          undefined,
          'profile_first',
        ),
      ).toEqual({
        creatorApproval: { status: ApprovalStatus.REJECTED },
      });
    });

    it('filters listed creators', () => {
      expect(
        buildAdminCreatorsListWhere(
          AdminCreatorListSegment.LISTED,
          undefined,
          'approval_first',
        ),
      ).toEqual({
        isListed: true,
      });
    });

    it('combines segment with search', () => {
      expect(
        buildAdminCreatorsListWhere(
          AdminCreatorListSegment.LISTED,
          'jane',
          'approval_first',
        ),
      ).toEqual({
        AND: [
          { isListed: true },
          { displayName: { contains: 'jane', mode: 'insensitive' } },
        ],
      });
    });
  });
});

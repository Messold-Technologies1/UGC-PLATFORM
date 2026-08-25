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
} from './creator-list-filters.util';
import { AdminCreatorListSegment } from './dto/admin-creator-list.dto';
import type { ListCreatorsQueryDto } from './dto/list-creators-query.dto';

describe('creator-list-filters.util', () => {
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

    it('matches any selected category across primary or secondary niche (no rank restriction)', () => {
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

    it('ANDs a category filter with city (composite filter)', () => {
      const q: ListCreatorsQueryDto = {
        city: 'Kolkata',
        contentCategory: ['fashion'],
      };
      expect(buildListCreatorsWhere(q)).toEqual({
        AND: [
          { isListed: true },
          { city: { contains: 'Kolkata', mode: 'insensitive' } },
          {
            facetSelections: {
              some: {
                option: {
                  dimension: CreatorFacetDimension.CONTENT_CATEGORY,
                  slug: { in: ['fashion'] },
                },
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

    it('filters by max delivery days across packages', () => {
      const q: ListCreatorsQueryDto = { maxDeliveryDays: 2 };
      expect(buildListCreatorsWhere(q)).toEqual({
        AND: [
          { isListed: true },
          {
            packages: {
              some: {
                deliveryDays: { lte: 2 },
              },
            },
          },
        ],
      });
    });

    it('searches across location, bio, niche, portfolio industry/tags, packages and restrictions — never the creator name', () => {
      const like = { contains: 'fashion', mode: 'insensitive' };
      expect(buildListCreatorsWhere({ search: 'fashion' })).toEqual({
        AND: [
          { isListed: true },
          {
            OR: [
              { city: like },
              { stateName: like },
              { countryName: like },
              { bio: like },
              {
                portfolioVideos: {
                  some: {
                    visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
                    industryLabel: like,
                  },
                },
              },
              {
                portfolioVideos: {
                  some: {
                    visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
                    tags: { some: { tag: like } },
                  },
                },
              },
              {
                facetSelections: {
                  some: {
                    OR: [{ option: { label: like } }, { customLabel: like }],
                  },
                },
              },
              { packages: { some: { name: like } } },
              { restrictions: { some: { restriction: like } } },
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

    it('filters self completed profiles awaiting a send-for-review', () => {
      expect(
        buildAdminCreatorsListWhere(
          AdminCreatorListSegment.SELF_COMPLETED,
          undefined,
          'profile_first',
        ),
      ).toEqual({
        completeProfile: true,
        creatorApproval: { status: ApprovalStatus.SELF_COMPLETED },
      });
    });

    it('keeps self completed profiles out of the awaiting review queue', () => {
      const pending = buildAdminCreatorsListWhere(
        AdminCreatorListSegment.PENDING,
        undefined,
        'profile_first',
      );
      expect(pending).toEqual({
        creatorApproval: { status: ApprovalStatus.PENDING },
        completeProfile: true,
      });
    });

    it('keeps self completed profiles out of the building profile queue', () => {
      const incomplete = buildAdminCreatorsListWhere(
        AdminCreatorListSegment.INCOMPLETE,
        undefined,
        'profile_first',
      );
      expect(incomplete).toEqual({
        completeProfile: false,
        creatorApproval: {
          status: {
            in: [ApprovalStatus.PENDING, ApprovalStatus.APPROVED],
          },
        },
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

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreatorSearchAnalyticsService } from './creator-search-analytics.service';
import {
  BrandSearchRowDto,
  CreatorSearchAnalyticsQueryDto,
  CreatorSearchAnalyticsResponseDto,
  CreatorSearchBrandsQueryDto,
} from './dto/creator-search-analytics.dto';

@ApiTags('Admin - Creator search')
@ApiBearerAuth()
@Controller('admin/creator-search')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminCreatorSearchController {
  constructor(private readonly analytics: CreatorSearchAnalyticsService) {}

  @Get('analytics')
  @ApiOperation({
    summary: 'Which filters brands actually use on the creator browse list',
    description:
      'Counts recorded searches over a window. One row is written per search ' +
      '(page 1 only — infinite scroll continues a search rather than starting ' +
      'one), so these are searches, not requests.',
  })
  @ApiOkResponse({ type: CreatorSearchAnalyticsResponseDto })
  async getAnalytics(
    @Query() query: CreatorSearchAnalyticsQueryDto,
  ): Promise<CreatorSearchAnalyticsResponseDto> {
    return this.analytics.summary({
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      audience: query.audience,
      brandProfileId: query.brandProfileId,
    });
  }

  @Get('brands')
  @ApiOperation({
    summary: 'Which brand searched for which filter',
    description:
      'One row per brand that searched in the window, with the filters it ' +
      'set and the values it chose. Signed-out visitors carry no brand and ' +
      'are excluded.',
  })
  @ApiOkResponse({ type: [BrandSearchRowDto] })
  async brands(
    @Query() query: CreatorSearchBrandsQueryDto,
  ): Promise<BrandSearchRowDto[]> {
    return this.analytics.brandBreakdown({
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }

}

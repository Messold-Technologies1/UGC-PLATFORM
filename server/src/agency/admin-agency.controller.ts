import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgencyService } from './agency.service';
import { AgenciesListResponseDto } from './dto/agencies-list-response.dto';
import { ListAgenciesQueryDto } from './dto/list-agencies-query.dto';
import { AdminAgencyDetailDto } from './dto/admin-agency-detail.dto';
import { AdminBrandWishlistsResponseDto } from '../brand-profile/dto/admin-brand-wishlists.dto';

@ApiTags('Admin - Agencies')
@ApiBearerAuth()
@Controller('admin/agencies')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAgencyController {
  constructor(private readonly agencyService: AgencyService) {}

  @Get()
  @ApiOperation({ summary: 'List all agencies (paginated)' })
  @ApiOkResponse({ type: AgenciesListResponseDto })
  listAgencies(
    @Query() query: ListAgenciesQueryDto,
  ): Promise<AgenciesListResponseDto> {
    return this.agencyService.listAgencies(query);
  }

  @Get(':agencyId')
  @ApiOperation({ summary: 'Get a single agency (header) by Agency id' })
  @ApiOkResponse({ type: AdminAgencyDetailDto })
  getAgency(
    @Param('agencyId', ParseUUIDPipe) agencyId: string,
  ): Promise<AdminAgencyDetailDto> {
    return this.agencyService.getAgencyForAdmin(agencyId);
  }

  @Get(':agencyId/wishlists')
  @ApiOperation({ summary: "List an agency's wishlists (with their creators)" })
  @ApiOkResponse({ type: AdminBrandWishlistsResponseDto })
  getAgencyWishlists(
    @Param('agencyId', ParseUUIDPipe) agencyId: string,
  ): Promise<AdminBrandWishlistsResponseDto> {
    return this.agencyService.listAgencyWishlistsForAdmin(agencyId);
  }
}

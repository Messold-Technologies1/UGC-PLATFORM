import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { BrandProfileService } from './brand-profile.service';
import { ListBrandsQueryDto } from './dto/list-brands-query.dto';
import { BrandsListResponseDto } from './dto/brands-list-response.dto';
import { RemoveBrandRoleDto } from './dto/remove-brand-role.dto';

@ApiTags('Admin - Brands')
@ApiBearerAuth()
@Controller('admin/brands')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminBrandController {
  constructor(private readonly brandProfileService: BrandProfileService) {}

  @Get()
  @ApiOperation({ summary: 'List all users with current brand access (paginated)' })
  @ApiOkResponse({ type: BrandsListResponseDto })
  async listBrands(
    @Query() query: ListBrandsQueryDto,
  ): Promise<BrandsListResponseDto> {
    return this.brandProfileService.listBrands(query);
  }

  @Delete('user/:userId/role')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove brand access from a user without deleting the user account',
  })
  async removeBrandAccess(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: RemoveBrandRoleDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.brandProfileService.removeBrandAccessFromUser(
      req.user.id,
      userId,
      dto,
    );
  }
}

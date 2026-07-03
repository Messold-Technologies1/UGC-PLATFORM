import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { LegalPagesService } from './legal-pages.service';
import { LegalPageResponseDto } from './dto';

@ApiTags('Legal Pages')
@Controller('legal-pages')
export class LegalPagesController {
  constructor(private readonly legalPagesService: LegalPagesService) {}

  @Get(':slug')
  @ApiOperation({
    summary: 'Get a published legal page by slug (public, no auth)',
    description:
      'Returns the live page metadata and all sections ordered by sortOrder. Used by the public-facing Privacy Policy and Terms of Service pages.',
  })
  @ApiParam({
    name: 'slug',
    example: 'privacy-policy',
    description: 'URL-safe page identifier',
  })
  @ApiOkResponse({ type: LegalPageResponseDto })
  async getPageBySlug(
    @Param('slug') slug: string,
  ): Promise<LegalPageResponseDto> {
    return this.legalPagesService.getPageBySlug(slug);
  }
}

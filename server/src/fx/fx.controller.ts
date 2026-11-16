import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { FxRatesResponseDto } from './dto/fx-rates-response.dto';
import { FxService } from './fx.service';

/**
 * Unauthenticated on purpose. Published exchange rates are not private, and
 * guarding this would make FxModule depend on AuthModule — which already
 * reaches FxModule through the package service, so it is a cycle. The
 * response is cached for twelve hours, so an open endpoint still costs one
 * upstream call a day however often it is hit.
 */
@ApiTags('FX')
@Controller('fx')
export class FxController {
  constructor(private readonly fx: FxService) {}

  @Get('rates')
  @ApiOperation({
    summary: 'Exchange rates against INR, for the creator pricing converter',
    description:
      'Rates are "units of that currency per 1 INR". `available: false` means ' +
      'the upstream could not be reached and nothing is cached — the caller ' +
      'should ask for a rupee amount directly rather than guess a rate.',
  })
  @ApiOkResponse({ type: FxRatesResponseDto })
  async rates(): Promise<FxRatesResponseDto> {
    const rates = await this.fx.getInrRates();
    if (!rates) {
      return { available: false, base: 'INR', date: '', stale: false, rates: {} };
    }
    return {
      available: true,
      base: 'INR',
      date: rates.date,
      stale: rates.stale,
      rates: rates.rates,
    };
  }
}

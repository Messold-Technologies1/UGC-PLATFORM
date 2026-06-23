import { Module } from '@nestjs/common';
import { CitiesService } from './cities.service';

/**
 * Standalone location-resolution module. Exports `CitiesService` for the
 * (future) AI-search module to resolve alias spellings to canonical city/state
 * names before the hard filter. PrismaService is provided globally.
 */
@Module({
  providers: [CitiesService],
  exports: [CitiesService],
})
export class CitiesModule {}

import { Module } from '@nestjs/common';
import { CreatorPackageService } from './creator-package.service';

@Module({
  providers: [CreatorPackageService],
  exports: [CreatorPackageService],
})
export class CreatorPackageModule {}

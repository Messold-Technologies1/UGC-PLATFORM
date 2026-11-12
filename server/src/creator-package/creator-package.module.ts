import { Module } from '@nestjs/common';
import { FxModule } from '../fx/fx.module';
import { CreatorPackageService } from './creator-package.service';

@Module({
  imports: [FxModule],
  providers: [CreatorPackageService],
  exports: [CreatorPackageService],
})
export class CreatorPackageModule {}

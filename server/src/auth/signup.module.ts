import { Module, forwardRef } from '@nestjs/common';
import { AgencyModule } from '../agency/agency.module';
import { BrandProfileModule } from '../brand-profile/brand-profile.module';
import { CreatorProfileModule } from '../creator-profile/creator-profile.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { PhoneVerificationService } from './phone-verification.service';
import { SignupRegistrationService } from './signup-registration.service';

/**
 * Role-based signup orchestration. Imported by AuthModule only (not by profile modules)
 * to avoid AuthModule <-> CreatorProfileModule circular imports at load time.
 */
@Module({
  imports: [
    PrismaModule,
    StorageModule,
    forwardRef(() => CreatorProfileModule),
    forwardRef(() => BrandProfileModule),
    forwardRef(() => AgencyModule),
  ],
  providers: [SignupRegistrationService, PhoneVerificationService],
  exports: [SignupRegistrationService, PhoneVerificationService],
})
export class SignupModule {}

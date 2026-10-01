import { Module, forwardRef } from '@nestjs/common';
import { AgencyModule } from '../agency/agency.module';
import { BrandProfileModule } from '../brand-profile/brand-profile.module';
import { CreatorProfileModule } from '../creator-profile/creator-profile.module';
import { CreatorReminderModule } from '../jobs/creator-reminder.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { StorageModule } from '../storage/storage.module';
import { PhoneVerificationService } from './phone-verification.service';
import { TwilioOtpTransport } from './twilio-otp.transport';
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
    CreatorReminderModule,
    // PhoneVerificationService sends OTPs through the raw Cloud API transport
    // on the first tier, falling back to Twilio on later resends.
    WhatsAppModule,
  ],
  providers: [
    SignupRegistrationService,
    PhoneVerificationService,
    TwilioOtpTransport,
  ],
  exports: [SignupRegistrationService, PhoneVerificationService],
})
export class SignupModule {}

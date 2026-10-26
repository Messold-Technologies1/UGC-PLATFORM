import { PATH_METADATA } from '@nestjs/common/constants';

import { AgencyBrandLinksController } from './agency-brand-links.controller';
import { BrandAgencyLinksController } from './brand-agency-links.controller';

/**
 * Pins the mount points, because getting one wrong fails silently.
 *
 * The brand controller was mounted at 'brand-profile/agency-links' while the
 * client called /api/brands/profile/agency-links. Nothing caught it: the
 * service and its guards are unit tested in isolation, so every test passed
 * while the route simply did not exist. The brand saw a 404 whose body read
 * "Cannot GET ..." — indistinguishable, on screen, from the feature being
 * switched off.
 *
 * These strings plus the 'api' global prefix are the full URLs the client's
 * ENDPOINTS.BRANDS/AGENCY entries name. Changing one means changing both.
 */
describe('agency-brand-link controller mount points', () => {
  it('serves the brand routes under the brands/profile family', () => {
    expect(Reflect.getMetadata(PATH_METADATA, BrandAgencyLinksController)).toBe(
      'brands/profile/agency-links',
    );
  });

  it('serves the agency routes under agency', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AgencyBrandLinksController)).toBe(
      'agency',
    );
  });
});

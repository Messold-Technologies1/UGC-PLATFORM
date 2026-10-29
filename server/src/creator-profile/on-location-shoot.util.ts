/**
 * Catalog slug for the creator's optional "Travel within City" add-on: the
 * creator comes to a location the brand picks instead of shooting at their own
 * setup.
 *
 * `CreatorAddOn` has no slug of its own, so a creator offers this when they
 * carry an add-on whose *name* matches the catalog option's. One definition,
 * shared by the order flow that charges for it and the browse card that
 * advertises it, so the card can never say a creator travels when checkout
 * would disagree.
 */
export const ON_LOCATION_SHOOT_OPTION_SLUG = 'on_location_shoot';

/** The shape of an add-on row as the list and wishlist includes select it. */
type AddOnLike = { name?: string | null; priceAmount?: unknown };

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (value == null) return 0;
  const parsed = Number(
    typeof value === 'string'
      ? value
      : typeof (value as { toString?: () => string }).toString === 'function'
        ? (value as { toString: () => string }).toString()
        : '',
  );
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Whether this creator offers an on-location shoot.
 *
 * Priced at zero counts as not offering it, matching what the order flow does:
 * there would be nothing for a brand to buy, so the card must not promise it.
 */
export function offersOnLocationShoot(
  addOns: AddOnLike[] | null | undefined,
  optionName: string | null | undefined,
): boolean {
  if (!optionName || !Array.isArray(addOns)) return false;
  return addOns.some(
    (addOn) => addOn?.name === optionName && toNumber(addOn.priceAmount) > 0,
  );
}

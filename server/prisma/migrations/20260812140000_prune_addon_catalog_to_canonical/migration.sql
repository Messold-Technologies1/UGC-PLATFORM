-- Prune the add-on catalog (and creators' selections) to exactly the three
-- canonical add-ons. Some environments still carry retired rows — e.g. the
-- long-ago-removed "Script Writing" (script_writing, minPrice NULL → shows as
-- "Min ₹0"). The earlier reduce migration only deleted specific slugs, so any
-- drift survived; deleting everything that is NOT canonical is drift-proof.

DELETE FROM "CreatorAddOn"
WHERE "name" NOT IN (
  'Revision',
  'Usage Rights extra 30 days',
  'Travel within City'
);

DELETE FROM "CreatorAddOnOption"
WHERE "slug" NOT IN (
  'extra_revision',
  'paid_ads_usage_30_days',
  'on_location_shoot'
);

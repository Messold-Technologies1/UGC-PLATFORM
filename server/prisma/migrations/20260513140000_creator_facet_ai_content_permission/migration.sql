-- New enum value only (must commit before INSERT can reference it — see next migration).
ALTER TYPE "CreatorFacetDimension" ADD VALUE 'AI_CONTENT_PERMISSION';

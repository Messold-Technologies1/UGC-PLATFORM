-- Languages are now a simple multi-select without fluency.
-- Existing creators keep their selected languages; only the fluency is dropped.
ALTER TABLE "CreatorProfileLanguage" DROP COLUMN "fluency";

DROP TYPE "CreatorLanguageFluency";

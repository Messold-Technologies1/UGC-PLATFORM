-- Add-on options catalog (predefined)

CREATE TABLE "CreatorAddOnOption" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "fixedPrice" INTEGER,
  "minPrice" INTEGER,
  "stepPrice" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CreatorAddOnOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatorAddOnOption_slug_key" ON "CreatorAddOnOption"("slug");
CREATE UNIQUE INDEX "CreatorAddOnOption_name_key" ON "CreatorAddOnOption"("name");
CREATE INDEX "CreatorAddOnOption_sortOrder_idx" ON "CreatorAddOnOption"("sortOrder");


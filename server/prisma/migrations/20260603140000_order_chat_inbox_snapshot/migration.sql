-- Denormalized chat inbox fields on Order
ALTER TABLE "Order" ADD COLUMN "lastChatActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Order" ADD COLUMN "lastChatMessageId" UUID;
ALTER TABLE "Order" ADD COLUMN "lastChatMessageSenderUserId" UUID;
ALTER TABLE "Order" ADD COLUMN "lastChatMessageType" "OrderChatMessageType";
ALTER TABLE "Order" ADD COLUMN "lastChatMessageText" TEXT;

-- Backfill activity + latest message snapshot from existing messages
UPDATE "Order" o
SET
  "lastChatActivityAt" = COALESCE(lm."createdAt", o."updatedAt"),
  "lastChatMessageId" = lm.id,
  "lastChatMessageSenderUserId" = lm."senderUserId",
  "lastChatMessageType" = lm.type,
  "lastChatMessageText" = CASE WHEN lm.type = 'TEXT' THEN lm.text ELSE NULL END
FROM (
  SELECT DISTINCT ON (m."orderId")
    m."orderId",
    m.id,
    m."senderUserId",
    m.type,
    m.text,
    m."createdAt"
  FROM "OrderChatMessage" m
  ORDER BY m."orderId", m."createdAt" DESC, m.id DESC
) lm
WHERE o.id = lm."orderId";

-- Orders without messages: keep default lastChatActivityAt aligned to updatedAt
UPDATE "Order" o
SET "lastChatActivityAt" = o."updatedAt"
WHERE o."lastChatMessageId" IS NULL;

CREATE INDEX "Order_brandId_lastChatActivityAt_idx" ON "Order"("brandId", "lastChatActivityAt" DESC);
CREATE INDEX "Order_creatorId_lastChatActivityAt_idx" ON "Order"("creatorId", "lastChatActivityAt" DESC);

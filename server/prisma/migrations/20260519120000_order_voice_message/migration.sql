CREATE TYPE "OrderChatMessageType" AS ENUM ('TEXT', 'VOICE');
ALTER TABLE "OrderChatMessage"
  ADD COLUMN "type" "OrderChatMessageType" NOT NULL DEFAULT 'TEXT',
  ADD COLUMN "audioKey" TEXT,
  ADD COLUMN "audioDurationMs" INTEGER,
  ADD COLUMN "audioMimeType" TEXT;
ALTER TABLE "OrderChatMessage" ALTER COLUMN "text" DROP NOT NULL;
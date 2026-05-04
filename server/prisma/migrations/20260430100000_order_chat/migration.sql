-- CreateTable
CREATE TABLE "OrderChatMessage" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "senderUserId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "clientMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderChatReadState" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "lastReadMessageId" UUID,
    "lastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderChatReadState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderChatMessage_orderId_createdAt_idx" ON "OrderChatMessage"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderChatMessage_orderId_senderUserId_clientMessageId_key" ON "OrderChatMessage"("orderId", "senderUserId", "clientMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderChatReadState_orderId_userId_key" ON "OrderChatReadState"("orderId", "userId");

-- CreateIndex
CREATE INDEX "OrderChatReadState_orderId_idx" ON "OrderChatReadState"("orderId");

-- CreateIndex
CREATE INDEX "OrderChatReadState_userId_idx" ON "OrderChatReadState"("userId");

-- AddForeignKey
ALTER TABLE "OrderChatMessage" ADD CONSTRAINT "OrderChatMessage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderChatMessage" ADD CONSTRAINT "OrderChatMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderChatReadState" ADD CONSTRAINT "OrderChatReadState_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderChatReadState" ADD CONSTRAINT "OrderChatReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderChatReadState" ADD CONSTRAINT "OrderChatReadState_lastReadMessageId_fkey" FOREIGN KEY ("lastReadMessageId") REFERENCES "OrderChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;


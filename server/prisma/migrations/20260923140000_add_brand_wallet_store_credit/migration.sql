-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('ORDER_CANCELLATION_CREDIT', 'ORDER_CHECKOUT_DEBIT', 'CHECKOUT_REVERSAL_CREDIT', 'WITHDRAWAL_DEBIT', 'WITHDRAWAL_REVERSAL_CREDIT', 'ADMIN_ADJUSTMENT_CREDIT', 'ADMIN_ADJUSTMENT_DEBIT');

-- CreateEnum
CREATE TYPE "WalletWithdrawalStatus" AS ENUM ('REQUESTED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'CANCELLED_CREDITED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "creditsAppliedPaise" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "BrandWallet" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "balancePaise" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "balanceAfterPaise" INTEGER NOT NULL,
    "reason" TEXT,
    "orderId" UUID,
    "withdrawalId" UUID,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletWithdrawal" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "status" "WalletWithdrawalStatus" NOT NULL DEFAULT 'REQUESTED',
    "brandNote" TEXT,
    "adminNote" TEXT,
    "requestedByUserId" UUID NOT NULL,
    "processedByUserId" UUID,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandWallet_brandId_key" ON "BrandWallet"("brandId");

-- CreateIndex
CREATE INDEX "BrandWallet_brandId_idx" ON "BrandWallet"("brandId");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_orderId_idx" ON "WalletTransaction"("orderId");

-- CreateIndex
CREATE INDEX "WalletTransaction_withdrawalId_idx" ON "WalletTransaction"("withdrawalId");

-- CreateIndex
CREATE INDEX "WalletWithdrawal_status_createdAt_idx" ON "WalletWithdrawal"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WalletWithdrawal_brandId_createdAt_idx" ON "WalletWithdrawal"("brandId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletWithdrawal_walletId_idx" ON "WalletWithdrawal"("walletId");

-- AddForeignKey
ALTER TABLE "BrandWallet" ADD CONSTRAINT "BrandWallet_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "BrandProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "BrandWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "WalletWithdrawal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletWithdrawal" ADD CONSTRAINT "WalletWithdrawal_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "BrandWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Non-negative balance guard: defence in depth alongside the atomic conditional
-- debit in WalletService. The wallet balance must never go negative.
ALTER TABLE "BrandWallet" ADD CONSTRAINT "BrandWallet_balancePaise_nonnegative" CHECK ("balancePaise" >= 0);

-- New enum value only. PostgreSQL forbids using a new enum value in the same
-- transaction as ADD VALUE (55P04). Column + backfill live in the next migration.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'BRIEF_ACCEPTED';

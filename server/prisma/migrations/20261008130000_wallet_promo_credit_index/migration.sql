-- One completion reward per order, enforced by the database: a retried accept
-- or a concurrent double-accept can never pay the brand twice. Partial, because
-- every other movement type legitimately repeats on the same order (a checkout
-- debit can be reversed and re-taken).
--
-- Separate from the migration that adds 'ORDER_COMPLETION_CREDIT' because
-- Postgres rejects a new enum value used in the same transaction that added it
-- ("unsafe use of new value ... New enum values must be committed before they
-- can be used"). Each migration file is its own transaction, so by the time
-- this runs the value is committed.

CREATE UNIQUE INDEX "WalletTransaction_one_completion_credit_per_order"
  ON "WalletTransaction" ("orderId")
  WHERE "type" = 'ORDER_COMPLETION_CREDIT';

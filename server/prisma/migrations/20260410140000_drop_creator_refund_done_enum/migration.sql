-- Use REFUNDED as the only terminal refund status (CREATOR_REFUND_DONE removed from app schema).
-- Neon/Postgres may not support ALTER TYPE ... DROP VALUE; unused enum label can remain in DB.
UPDATE "Order" SET status = 'REFUNDED'::"OrderStatus" WHERE status::text = 'CREATOR_REFUND_DONE';

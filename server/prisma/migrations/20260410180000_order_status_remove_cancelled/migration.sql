-- Retire CANCELLED: map existing rows to REJECTED (Postgres may keep unused enum label).
UPDATE "Order" SET status = 'REJECTED'::"OrderStatus" WHERE status::text = 'CANCELLED';

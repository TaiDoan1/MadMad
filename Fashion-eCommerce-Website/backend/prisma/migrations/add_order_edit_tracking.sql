-- Order edit tracking: flag edited orders and store per-item change metadata
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "isEdited" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3);

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "editMetaJson" TEXT;

-- Gift product fields for promotional free items (hàng tặng)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isGiftProduct" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "giftConditionsJson" TEXT;

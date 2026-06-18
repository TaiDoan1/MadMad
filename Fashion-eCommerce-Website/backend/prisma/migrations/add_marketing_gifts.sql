-- Marketing gifts tables for KOL/KOC gift tracking
CREATE TABLE IF NOT EXISTS "MarketingGift" (
  "id" TEXT NOT NULL,
  "giftNumber" TEXT NOT NULL,
  "kolName" TEXT NOT NULL,
  "kolHandle" TEXT,
  "platform" TEXT,
  "contactInfo" TEXT,
  "cashAmount" INTEGER NOT NULL DEFAULT 0,
  "productValue" INTEGER NOT NULL DEFAULT 0,
  "totalCost" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingGift_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MarketingGift_giftNumber_key" ON "MarketingGift"("giftNumber");

CREATE TABLE IF NOT EXISTS "MarketingGiftItem" (
  "id" TEXT NOT NULL,
  "giftId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "productImage" TEXT,
  "color" TEXT NOT NULL,
  "size" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  "lineTotal" INTEGER NOT NULL,
  CONSTRAINT "MarketingGiftItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MarketingGiftItem"
  DROP CONSTRAINT IF EXISTS "MarketingGiftItem_giftId_fkey";

ALTER TABLE "MarketingGiftItem"
  ADD CONSTRAINT "MarketingGiftItem_giftId_fkey"
  FOREIGN KEY ("giftId") REFERENCES "MarketingGift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

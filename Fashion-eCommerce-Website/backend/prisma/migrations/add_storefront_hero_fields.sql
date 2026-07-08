-- Add hero banner / popular category / best seller image fields to StorefrontSetting table
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "heroImage" TEXT;
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "heroImagesJson" TEXT DEFAULT '[]';
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "heroImageScalePercent" INTEGER DEFAULT 100;
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "heroSlideIntervalMs" INTEGER DEFAULT 6000;
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "heroBadgeText" TEXT;
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "heroTitleLine1" TEXT;
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "heroTitleLine2" TEXT;
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "heroDescription" TEXT;
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "heroButtonText" TEXT;
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "heroOverlayOpacityLeft" INTEGER DEFAULT 60;
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "heroOverlayOpacityMiddle" INTEGER DEFAULT 40;
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "heroOverlayOpacityRight" INTEGER DEFAULT 60;
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "heroContentAlign" TEXT DEFAULT 'center';
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "heroFontStyle" TEXT DEFAULT 'default';
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "popularCategoryImagesJson" TEXT DEFAULT '[]';
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "bestSellerProductIdsJson" TEXT DEFAULT '[]';
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "bestSellerImageOverridesJson" TEXT DEFAULT '{}';
ALTER TABLE "StorefrontSetting" ADD COLUMN IF NOT EXISTS "colorHexMapJson" TEXT DEFAULT '{}';
